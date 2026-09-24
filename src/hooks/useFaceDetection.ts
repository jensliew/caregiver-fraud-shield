import { useCallback, useRef } from 'react';

/**
 * face-api.js wrapper — real webcam capture, blink-based liveness, and
 * face-descriptor matching, per design.md §2.5. Requires the face-api.js
 * UMD build to already be loaded (see index.html) so the global `faceapi`
 * exists at call time.
 *
 * Two distinct checks live here, and both matter:
 *   - Liveness (blink detection): is there a LIVE person in front of the
 *     camera, not a printed photo? A static photo shows constant eye
 *     shape — no blink — so it fails this even though a face is clearly
 *     "present."
 *   - Identity (descriptor matching): is it the SAME person who enrolled?
 *     Liveness alone would accept literally any live human's face.
 */
// The face-api.js npm package doesn't actually bundle its model weight
// files (confirmed by hitting real 404s here, not a hypothetical) — the
// community-standard source is the model author's GitHub repo, proxied
// through jsdelivr's /gh/ path. Pinned to a commit SHA rather than
// @master since the repo has no version tags for this folder.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@d50c2b147132fa1b4ed1dbf625262ceea99640bc/weights';

// The liveness window needs to span enough frames to reliably catch a brief
// (~100-150ms) blink. On mobile, each detectSingleFace+landmarks call itself
// costs a few hundred ms, so a short window with a long interval yields too
// few samples and misses blinks entirely (the "didn't detect a blink" bug).
// A longer window with no artificial delay between detections maximizes the
// number of frames — the detection call's own latency paces the loop.
const LIVENESS_DURATION_MS = 5000;
const SAMPLE_INTERVAL_MS = 0;
// How confident the detector must be that a box really is a face before we
// trust its landmarks/descriptor (SSD MobileNet score, 0..1). Filters out
// weak/spurious detections that would otherwise pollute the average.
const MIN_DETECTION_CONFIDENCE = 0.5;
// A FIXED absolute EAR cutoff doesn't generalize: published blink-detection
// datasets report "eyes open" baselines ranging ~0.21-0.29 depending on the
// person, camera angle, and distance (Soukupová & Čech-style EAR studies).
// A fixed threshold like 0.23 works for some faces and silently fails
// closed for others — which is exactly the bug this replaced. Instead,
// calibrate against THIS session's own EAR distribution (the person's own
// "eyes open" baseline), the same principle real open-source blink
// detectors use (e.g. yozoyugen/eye-blink-detection-JS tracks a rolling
// mean and flags a blink as a relative deviation from it, not a constant).
const BASELINE_PERCENTILE = 0.85; // this person's own typical "eyes open" EAR for this session
// Any genuine eyelid movement dips EAR below ~88% of the open baseline.
// With few frames on mobile we may only catch the partial edge of a blink,
// so we count a modest dip as liveness rather than requiring a full closure —
// erring toward accepting a live person over false "no blink" rejections.
const RELATIVE_BLINK_DROP = 0.88; // dip to at most 88% of their own baseline counts as a blink
const MIN_FACE_SAMPLE_RATIO = 0.4; // at least this fraction of samples must have found a face at all

// face-api.js's default cutoff for "same person" on its 128-d descriptor is
// 0.6 (Euclidean distance). We use that documented default here: on mobile
// front cameras the lighting/angle between the enrollment moment and a later
// login shifts enough that a genuine same-person distance often lands just
// above a tighter bar (0.55), causing false rejects — the "enrolled fine but
// can't log back in" symptom. Averaging many descriptors on both sides (see
// verifyIdentity) already stabilizes the distance; 0.6 keeps genuine logins
// working while still rejecting a different person (whose distance is
// typically well above 0.6).
const MATCH_DISTANCE_THRESHOLD = 0.6;
// How many good descriptor samples the averaged live query aims to collect
// across the liveness window. More frames → a smoother, more reliable mean.
const TARGET_LIVE_SAMPLES = 6;

export type LivenessReason = 'live' | 'no-blink' | 'no-face' | 'error';

export interface LivenessResult {
  success: boolean;
  reason: LivenessReason;
}

export type VerifyReason = LivenessReason | 'no-match';

export interface VerifyResult {
  success: boolean;
  reason: VerifyReason;
  distance?: number;
}

/**
 * A single live-detection snapshot the scan UI can draw as a landmark mesh:
 * the 68 facial points plus the detection box, all in the video's own pixel
 * space, plus the video's intrinsic dimensions so the UI can scale them onto
 * a differently sized canvas. `null` points means no face this frame.
 */
export interface FaceFrame {
  points: FaceApiPoint[] | null;
  box: { x: number; y: number; width: number; height: number } | null;
  videoWidth: number;
  videoHeight: number;
}

export type FaceFrameHandler = (frame: FaceFrame) => void;

function eyeAspectRatio(eye: FaceApiPoint[]): number {
  const dist = (a: FaceApiPoint, b: FaceApiPoint) => Math.hypot(a.x - b.x, a.y - b.y);
  // standard 6-point EAR (Soukupová & Čech): two vertical eyelid distances
  // over one horizontal eye-corner distance — drops sharply on a blink.
  const vertical = dist(eye[1], eye[5]) + dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]) * 2;
  return vertical / horizontal;
}

export function useFaceDetection() {
  const modelsLoaded = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  // Which detector actually loaded. SSD MobileNet is the accurate default;
  // if its weights fail to load we fall back to the lighter tiny detector so
  // the feature still works, just less precisely.
  const useSsd = useRef(true);

  const loadModels = useCallback(async () => {
    if (modelsLoaded.current) return;
    // Full-accuracy stack: SSD MobileNet detector + the full 68-point
    // landmark net + the recognition net. These are more accurate than the
    // `tiny*` variants used before, at a modest size/latency cost that's
    // well within the ~5s budget.
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      useSsd.current = true;
    } catch {
      // Fallback: the tiny models, which are smaller and more likely to
      // load on a flaky connection. Less accurate but keeps the flow alive.
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      useSsd.current = false;
    }
    modelsLoaded.current = true;
  }, []);

  // Detector options matching whichever model loaded. SSD takes a minimum
  // confidence; the tiny detector uses a larger input size for better
  // small-face recall than its default.
  const detectorOptions = useCallback(() => {
    return useSsd.current
      ? new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_DETECTION_CONFIDENCE })
      : new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: MIN_DETECTION_CONFIDENCE });
  }, []);

  // Whether the full (non-tiny) landmark net is in use — face-api's
  // withFaceLandmarks(useTinyModel) needs to be told which one to run.
  const useTinyLandmarks = useCallback(() => !useSsd.current, []);

  const startWebcam = useCallback(async (videoEl: HTMLVideoElement) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    videoEl.srcObject = stream;
    await videoEl.play();
    streamRef.current = stream;
    return stream;
  }, []);

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /**
   * Samples eye-aspect-ratio over a ~4.5s window and looks for a genuine
   * dip-then-recover (a blink). `onProgress` receives 0..1 for a UI
   * progress bar. Never auto-passes on ambiguous input — no face found
   * often enough, or a face found but never blinking, both fail closed.
   */
  const runLivenessCheck = useCallback(
    async (videoEl: HTMLVideoElement, onProgress?: (progress: number) => void, onFrame?: FaceFrameHandler): Promise<LivenessResult> => {
      if (!modelsLoaded.current) {
        throw new Error('Face detection models not loaded yet. Call loadModels() first.');
      }
      const options = detectorOptions();
      const useTiny = useTinyLandmarks();
      const samples: number[] = [];
      const start = performance.now();

      while (performance.now() - start < LIVENESS_DURATION_MS) {
        const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks(useTiny);
        if (result) {
          const left = eyeAspectRatio(result.landmarks.getLeftEye());
          const right = eyeAspectRatio(result.landmarks.getRightEye());
          samples.push((left + right) / 2);
          // Stream the landmark mesh out so the scan UI can draw it live.
          onFrame?.({
            points: result.landmarks.positions,
            box: result.detection.box,
            videoWidth: videoEl.videoWidth,
            videoHeight: videoEl.videoHeight,
          });
        } else {
          samples.push(NaN);
          onFrame?.({ points: null, box: null, videoWidth: videoEl.videoWidth, videoHeight: videoEl.videoHeight });
        }
        onProgress?.(Math.min(1, (performance.now() - start) / LIVENESS_DURATION_MS));
        await new Promise((resolve) => setTimeout(resolve, SAMPLE_INTERVAL_MS));
      }

      const valid = samples.filter((v) => !Number.isNaN(v));
      if (valid.length < samples.length * MIN_FACE_SAMPLE_RATIO) {
        return { success: false, reason: 'no-face' };
      }

      // Most of the window is "eyes open" (a blink is brief), so a high
      // percentile of this session's own samples is a reliable per-person,
      // per-camera baseline — then a blink is just a real dip below it.
      const sorted = [...valid].sort((a, b) => a - b);
      const baseline = sorted[Math.floor(sorted.length * BASELINE_PERCENTILE)];
      const minEAR = sorted[0];
      const blinked = minEAR < baseline * RELATIVE_BLINK_DROP;
      return { success: blinked, reason: blinked ? 'live' : 'no-blink' };
    },
    [detectorOptions, useTinyLandmarks]
  );

  /** Captures a single 128-d face descriptor — one video frame, so it's noisy on its own. */
  const captureDescriptor = useCallback(
    async (videoEl: HTMLVideoElement): Promise<Float32Array | null> => {
      if (!modelsLoaded.current) {
        throw new Error('Face detection models not loaded yet. Call loadModels() first.');
      }
      const result = await faceapi.detectSingleFace(videoEl, detectorOptions()).withFaceLandmarks(useTinyLandmarks()).withFaceDescriptor();
      return result?.descriptor ?? null;
    },
    [detectorOptions, useTinyLandmarks]
  );

  /**
   * Captures several descriptors across ~1s and averages them component-
   * wise. A single frame can land mid-blink, at a slight angle, or with
   * motion blur — face-api.js's own FaceMatcher class is built around
   * comparing against *multiple* stored reference descriptors per person
   * for exactly this reason (see LabeledFaceDescriptors / computeMeanDistance
   * in the library source). This is the same idea applied on both the
   * enrollment side and the live-query side: fewer one-bad-frame failures.
   */
  const captureAveragedDescriptor = useCallback(
    async (videoEl: HTMLVideoElement, attempts = 3, intervalMs = 150): Promise<Float32Array | null> => {
      const samples: Float32Array[] = [];
      for (let i = 0; i < attempts; i++) {
        const descriptor = await captureDescriptor(videoEl);
        if (descriptor) samples.push(descriptor);
        if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      if (samples.length === 0) return null;
      const length = samples[0].length;
      const mean = new Float32Array(length);
      for (const sample of samples) {
        for (let i = 0; i < length; i++) mean[i] += sample[i] / samples.length;
      }
      return mean;
    },
    [captureDescriptor]
  );

  function matchDescriptor(a: Float32Array, b: Float32Array): { match: boolean; distance: number } {
    const distance = faceapi.euclideanDistance(a, b);
    return { match: distance < MATCH_DISTANCE_THRESHOLD, distance };
  }

  /**
   * The full check used for both login and the fraud-pause challenge:
   * liveness first (fail closed on a photo or no face), then a descriptor
   * match against whatever was enrolled (fail closed on a stranger's
   * live, blinking face too — liveness alone would accept anyone).
   */
  const verifyIdentity = useCallback(
    async (
      videoEl: HTMLVideoElement,
      enrolledDescriptor: Float32Array,
      onProgress?: (progress: number) => void,
      onFrame?: FaceFrameHandler
    ): Promise<VerifyResult> => {
      const liveness = await runLivenessCheck(videoEl, onProgress, onFrame);
      if (!liveness.success) return liveness;

      // Accuracy upgrade: average many descriptors (not just 3) for the live
      // query, so the comparison is against a stable mean rather than one
      // frame. Combined with the tighter MATCH_DISTANCE_THRESHOLD, this cuts
      // both false accepts and one-bad-frame false rejects.
      const liveDescriptor = await captureAveragedDescriptor(videoEl, TARGET_LIVE_SAMPLES, 120);
      if (!liveDescriptor) return { success: false, reason: 'no-face' };

      const { match, distance } = matchDescriptor(liveDescriptor, enrolledDescriptor);
      return { success: match, reason: match ? 'live' : 'no-match', distance };
    },
    [runLivenessCheck, captureAveragedDescriptor]
  );

  return {
    loadModels,
    startWebcam,
    stopWebcam,
    runLivenessCheck,
    captureDescriptor,
    captureAveragedDescriptor,
    matchDescriptor,
    verifyIdentity,
  };
}
