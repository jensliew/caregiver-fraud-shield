import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './icons/Icon';
import { useFaceDetection, type FaceFrame, type VerifyResult } from '../hooks/useFaceDetection';

/**
 * Shared real-camera biometric capture — used for both enrollment ("save
 * my face") and verification ("prove it's the same person who enrolled"),
 * on the Login/Register screens and the fraud-pause flows, so every
 * "who is this really" moment in the app runs the same real check.
 *
 * The camera does NOT open on mount: until the user taps the scan button
 * they see a graphic placeholder inside a circular frame, not a black
 * video box. Tapping opens the webcam, draws the live feed in the circle
 * with an animated progress ring, and overlays the detected face-landmark
 * mesh (dots + connecting lines) so the scan visibly "sees" the face.
 */
type FaceScanProps =
  | {
      mode: 'enroll';
      scanLabel: string;
      scanIcon?: IconName;
      onEnrolled: (descriptor: Float32Array) => void;
    }
  | {
      mode: 'verify';
      scanLabel: string;
      scanIcon?: IconName;
      enrolledDescriptor: Float32Array;
      onResult: (result: VerifyResult) => void;
      /** Called when a fresh scan starts, so the parent can clear stale errors. */
      onScanStart?: () => void;
    };

const ENROLL_SAMPLE_COUNT = 5;
const ENROLL_SAMPLE_INTERVAL_MS = 250;

// The 68-point face-api landmark groups, connected into the mesh polylines
// drawn over the live face. Index ranges follow the standard 68-point model.
const MESH_PATHS: number[][] = [
  [17, 18, 19, 20, 21], // left eyebrow
  [22, 23, 24, 25, 26], // right eyebrow
  [27, 28, 29, 30], // nose bridge
  [31, 32, 33, 34, 35], // lower nose
  [36, 37, 38, 39, 40, 41, 36], // left eye (closed loop)
  [42, 43, 44, 45, 46, 47, 42], // right eye (closed loop)
  [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 48], // outer lips (closed loop)
];

export function FaceScanCapture(props: FaceScanProps) {
  const { mode, scanLabel, scanIcon } = props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { loadModels, startWebcam, stopWebcam, captureAveragedDescriptor, verifyIdentity } = useFaceDetection();
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);

  // Stop the webcam if this component unmounts mid-scan (e.g. the user
  // navigates away while the camera is still open) — a leaked getUserMedia
  // stream keeps the camera's hardware indicator lit after the UI is gone.
  useEffect(() => stopWebcam, [stopWebcam]);

  // Draws one detection frame's landmark mesh onto the overlay canvas,
  // mapping video-pixel coordinates onto the (mirrored) circular display.
  const drawFrame = useCallback((frame: FaceFrame) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { points, videoWidth, videoHeight } = frame;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!points || !videoWidth || !videoHeight) return;

    // The video is object-cover'd into a square and mirrored (selfie view),
    // so map each point through the same cover-scale + horizontal flip.
    const side = canvas.width;
    const scale = Math.max(side / videoWidth, side / videoHeight);
    const dx = (side - videoWidth * scale) / 2;
    const dy = (side - videoHeight * scale) / 2;
    const tx = (p: { x: number; y: number }) => side - (p.x * scale + dx); // mirror X
    const ty = (p: { x: number; y: number }) => p.y * scale + dy;

    ctx.strokeStyle = 'rgba(200, 16, 46, 0.85)';
    ctx.lineWidth = 1.5;
    for (const path of MESH_PATHS) {
      ctx.beginPath();
      path.forEach((idx, i) => {
        const p = points[idx];
        if (!p) return;
        const x = tx(p);
        const y = ty(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(200, 16, 46, 0.95)';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(tx(p), ty(p), 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  async function handleScan() {
    const video = videoRef.current;
    if (!video) return;
    // Let the parent clear any stale error from a previous attempt so we
    // never show a contradictory mix (e.g. an old "didn't match" alongside
    // this run's "Face verified").
    if (mode === 'verify') props.onScanStart?.();
    setScanning(true);
    setProgress(0);
    setStatus('Loading face detection…');
    try {
      await loadModels();
    } catch {
      setScanning(false);
      setStatus('Could not load the face detection model. Check your internet connection and try again.');
      if (mode === 'verify') props.onResult({ success: false, reason: 'error' });
      return;
    }

    try {
      setStatus('Starting camera…');
      await startWebcam(video);

      if (mode === 'enroll') {
        setStatus('Hold still, looking at the camera…');
        const descriptor = await captureAveragedDescriptor(video, ENROLL_SAMPLE_COUNT, ENROLL_SAMPLE_INTERVAL_MS);
        setProgress(1);
        stopWebcam();
        setScanning(false);
        if (descriptor) {
          setStatus('Face captured.');
          props.onEnrolled(descriptor);
        } else {
          setStatus('No face detected. Try again with better lighting.');
        }
        return;
      }

      setStatus('Look at the camera and blink naturally…');
      const result = await verifyIdentity(video, props.enrolledDescriptor, setProgress, drawFrame);
      stopWebcam();
      setScanning(false);

      if (result.success) {
        setStatus('Face verified.');
      } else if (result.reason === 'no-face') {
        setStatus('No face detected. Try again with better lighting, closer to the camera.');
      } else if (result.reason === 'no-blink') {
        setStatus("Didn't detect a blink. Look straight at the camera and try again.");
      } else if (result.reason === 'no-match') {
        setStatus("That doesn't match the enrolled face. Try again or use your PIN.");
      } else {
        setStatus('Verification failed. Try again.');
      }
      props.onResult(result);
    } catch {
      stopWebcam();
      setScanning(false);
      setStatus('Camera unavailable.');
      if (mode === 'verify') props.onResult({ success: false, reason: 'error' });
    }
  }

  // Progress-ring geometry (SVG circle stroke-dashoffset).
  const RING = 168; // circle diameter in px
  const R = RING / 2 - 5;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="relative" style={{ width: RING, height: RING }}>
        {/* Soft brand halo behind the ring */}
        <div className="absolute inset-0 rounded-full bg-accent-soft opacity-60 blur-xl" aria-hidden="true" />

        {/* Progress ring */}
        <svg width={RING} height={RING} className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="#e2d9c7" strokeWidth={5} />
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            fill="none"
            stroke="#c8102e"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 150ms linear' }}
          />
        </svg>

        {/* Circular camera / placeholder */}
        <div className="absolute overflow-hidden rounded-full bg-bg flex items-center justify-center ring-1 ring-border" style={{ inset: 10 }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          <canvas
            ref={canvasRef}
            width={RING - 20}
            height={RING - 20}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ display: scanning ? 'block' : 'none' }}
          />
          {/* Idle graphic — a face-scan glyph in a soft disc, no black box */}
          {!scanning && (
            <div className="flex flex-col items-center gap-1 text-accent">
              <Icon name={scanIcon ?? 'faceScan'} size={64} />
            </div>
          )}
        </div>
      </div>

      <Button variant="slate" block onClick={handleScan} disabled={scanning}>
        {scanIcon && <Icon name={scanIcon} size={22} />}
        {scanLabel}
      </Button>
      {status && <p className="text-sm text-ink-muted min-h-[1.2em] text-center max-w-[32ch]">{status}</p>}
    </div>
  );
}
