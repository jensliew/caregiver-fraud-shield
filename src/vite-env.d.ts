/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CAREGIVER_EMAIL_ENDPOINT?: string;
  readonly VITE_AUTH_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// face-api.js is loaded globally via a <script> tag in index.html (see
// src/hooks/useFaceDetection.ts) rather than imported as a module, so we
// only need to describe the surface this app actually calls: the tiny
// face detector, the tiny 68-point landmark model (for blink-based
// liveness), and the recognition net (for the 128-d descriptor used to
// match a live face against the enrolled one).
interface FaceApiPoint {
  x: number;
  y: number;
}

interface FaceApiLandmarks {
  getLeftEye: () => FaceApiPoint[];
  getRightEye: () => FaceApiPoint[];
  positions: FaceApiPoint[];
}

interface FaceApiBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceApiDetectionWithLandmarks {
  landmarks: FaceApiLandmarks;
  detection: { box: FaceApiBox; score: number };
}

interface FaceApiDetectionWithDescriptor extends FaceApiDetectionWithLandmarks {
  descriptor: Float32Array;
}

type FaceApiLandmarksTask = PromiseLike<FaceApiDetectionWithLandmarks | undefined> & {
  withFaceDescriptor: () => Promise<FaceApiDetectionWithDescriptor | undefined>;
};

declare const faceapi: {
  nets: {
    tinyFaceDetector: {
      loadFromUri: (url: string) => Promise<void>;
    };
    ssdMobilenetv1: {
      loadFromUri: (url: string) => Promise<void>;
    };
    faceLandmark68TinyNet: {
      loadFromUri: (url: string) => Promise<void>;
    };
    faceLandmark68Net: {
      loadFromUri: (url: string) => Promise<void>;
    };
    faceRecognitionNet: {
      loadFromUri: (url: string) => Promise<void>;
    };
  };
  detectSingleFace: (
    input: HTMLVideoElement,
    options: unknown
  ) => {
    withFaceLandmarks: (useTinyModel?: boolean) => FaceApiLandmarksTask;
  };
  euclideanDistance: (a: ArrayLike<number>, b: ArrayLike<number>) => number;
  TinyFaceDetectorOptions: new (opts?: { inputSize?: number; scoreThreshold?: number }) => unknown;
  SsdMobilenetv1Options: new (opts?: { minConfidence?: number }) => unknown;
};
