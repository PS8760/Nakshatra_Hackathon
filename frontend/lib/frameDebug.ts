/**
 * frameDebug.ts
 * =============
 * Webcam frame capture diagnostics.
 *
 * Verifies:
 *   1. Video element is actually producing frames (readyState, currentTime advancing)
 *   2. Canvas can sample pixel data (not a black/blank frame)
 *   3. Base64 encoding produces a valid non-empty string
 *   4. Blob size is within expected range for a real frame
 *
 * Usage:
 *   import { diagnoseVideoStream, captureFrameBase64, captureFrameBlob } from "@/lib/frameDebug";
 *   const report = await diagnoseVideoStream(videoElement);
 *   console.table(report);
 */

export interface FrameDiagnostics {
  readyState: number;           // 0-4, must be ≥ 2 (HAVE_CURRENT_DATA)
  videoWidth: number;
  videoHeight: number;
  currentTime: number;          // must be > 0 after a second
  isPlaying: boolean;
  isBlackFrame: boolean;        // true if all sampled pixels are near-black
  meanBrightness: number;       // 0-255, < 5 = likely black frame
  base64Length: number;         // 0 = encoding failed
  blobSizeBytes: number;        // < 1000 = suspiciously small (blank frame)
  frameAdvanced: boolean;       // did currentTime change over 500ms?
  errors: string[];
}

/**
 * Sample a 10×10 grid of pixels from the centre of the frame.
 * Returns mean brightness (0–255). Values < 5 indicate a black/blank frame.
 */
function sampleBrightness(video: HTMLVideoElement): number {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;

  const offscreen = document.createElement("canvas");
  offscreen.width = 32;
  offscreen.height = 32;
  const ctx = offscreen.getContext("2d")!;

  // Draw centre crop
  const cx = w / 2 - 16, cy = h / 2 - 16;
  ctx.drawImage(video, cx, cy, 32, 32, 0, 0, 32, 32);

  const data = ctx.getImageData(0, 0, 32, 32).data;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return total / (32 * 32);
}

/**
 * Capture a single frame as a base64-encoded JPEG string.
 * Returns empty string on failure.
 *
 * @param quality  JPEG quality 0–1 (default 0.85)
 * @param width    Resize to this width before encoding (default: native)
 */
export function captureFrameBase64(
  video: HTMLVideoElement,
  quality = 0.85,
  width?: number,
): string {
  if (video.readyState < 2) return "";

  const srcW = video.videoWidth || 640;
  const srcH = video.videoHeight || 480;
  const outW = width ?? srcW;
  const outH = width ? Math.round(srcH * (width / srcW)) : srcH;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, outW, outH);

  // Returns "data:image/jpeg;base64,..." — strip the prefix for raw base64
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Capture a single frame as a Blob (for multipart/form-data uploads).
 */
export function captureFrameBlob(
  video: HTMLVideoElement,
  quality = 0.85,
  width?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (video.readyState < 2) return resolve(null);

    const srcW = video.videoWidth || 640;
    const srcH = video.videoHeight || 480;
    const outW = width ?? srcW;
    const outH = width ? Math.round(srcH * (width / srcW)) : srcH;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    canvas.getContext("2d")!.drawImage(video, 0, 0, outW, outH);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * Full stream diagnostic. Waits 500ms to check if currentTime advances.
 * Call this when detections are failing to identify the root cause.
 */
export async function diagnoseVideoStream(
  video: HTMLVideoElement,
): Promise<FrameDiagnostics> {
  const errors: string[] = [];
  const t0 = video.currentTime;

  // Wait 500ms to check if time advances
  await new Promise((r) => setTimeout(r, 500));
  const t1 = video.currentTime;
  const frameAdvanced = t1 > t0;

  if (video.readyState < 2) errors.push(`readyState=${video.readyState} — video not ready (need ≥ 2)`);
  if (video.videoWidth === 0) errors.push("videoWidth=0 — stream not attached or camera denied");
  if (!frameAdvanced) errors.push("currentTime not advancing — stream may be paused or stalled");

  const brightness = video.readyState >= 2 ? sampleBrightness(video) : 0;
  const isBlackFrame = brightness < 5;
  if (isBlackFrame) errors.push(`meanBrightness=${brightness.toFixed(1)} — black frame detected (lighting or permission issue)`);

  // Test base64 encoding
  const b64 = captureFrameBase64(video);
  const base64Length = b64.length;
  if (base64Length < 100) errors.push(`base64Length=${base64Length} — encoding failed or frame is empty`);

  // Test blob
  const blob = await captureFrameBlob(video);
  const blobSizeBytes = blob?.size ?? 0;
  if (blobSizeBytes < 1000) errors.push(`blobSize=${blobSizeBytes}B — suspiciously small, likely blank frame`);

  return {
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    currentTime: t1,
    isPlaying: !video.paused && !video.ended,
    isBlackFrame,
    meanBrightness: Math.round(brightness),
    base64Length,
    blobSizeBytes,
    frameAdvanced,
    errors,
  };
}

/**
 * Send a captured frame to the backend /pose/analyze endpoint.
 * Returns the parsed JSON response or an error object.
 */
export async function sendFrameToBackend(
  video: HTMLVideoElement,
  joint: string,
  target: number,
  apiBase = "/api",
): Promise<Record<string, unknown>> {
  const blob = await captureFrameBlob(video, 0.9, 640);
  if (!blob) return { error: "Failed to capture frame from video element" };

  const form = new FormData();
  form.append("frame", blob, "frame.jpg");
  form.append("joint", joint);
  form.append("target", String(target));

  try {
    const res = await fetch(`${apiBase}/pose/analyze`, { method: "POST", body: form });
    return await res.json();
  } catch (e: any) {
    return { error: e?.message ?? "Network error" };
  }
}
