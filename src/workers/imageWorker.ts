/**
 * Image Preprocessing & ML Preparation Web Worker
 * Krishi-Drishti Concurrency Architecture
 *
 * Runs heavy computations on a dedicated background thread:
 * 1. Data URI -> ArrayBuffer / Blob conversion (eliminates main thread `atob` loops).
 * 2. Image resizing & cropping via OffscreenCanvas / ImageBitmap.
 * 3. ML Model Tensor Preparation: Extracts RGB channels, scales to [0, 1],
 *    and applies ImageNet normalization (mean/std) into a Float32Array.
 * 4. Large JSON parsing offloaded from UI thread.
 */

export interface WorkerMessageRequest {
  id: string;
  type: 'DATA_URI_TO_BLOB' | 'RESIZE_AND_ENCODE' | 'PREPARE_ML_TENSOR' | 'ASYNC_PARSE_JSON';
  payload: any;
}

export interface WorkerMessageResponse {
  id: string;
  type: string;
  success: boolean;
  result?: any;
  error?: string;
}

// ── Web Worker Implementation ───────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerMessageRequest>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'DATA_URI_TO_BLOB': {
        const { dataUri } = payload;
        const [header, base64Data] = dataUri.split(',');
        const mime = header.split(':')[1].split(';')[0];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const blob = new Blob([bytes.buffer], { type: mime });
        // Return ArrayBuffer & transfer ownership to eliminate copy overhead
        self.postMessage(
          { id, type, success: true, result: { arrayBuffer: bytes.buffer, mime, size: len } },
          [bytes.buffer] as any
        );
        break;
      }

      case 'RESIZE_AND_ENCODE': {
        const { imageBitmap, targetWidth, targetHeight, quality } = payload;
        let width = targetWidth || 224;
        let height = targetHeight || 224;

        if (typeof OffscreenCanvas !== 'undefined') {
          const offscreen = new OffscreenCanvas(width, height);
          const ctx = offscreen.getContext('2d');
          if (ctx) {
            ctx.drawImage(imageBitmap, 0, 0, width, height);
            const blob = await offscreen.convertToBlob({
              type: 'image/jpeg',
              quality: quality || 0.85,
            });
            const buffer = await blob.arrayBuffer();
            self.postMessage(
              { id, type, success: true, result: { arrayBuffer: buffer, mime: 'image/jpeg', width, height } },
              [buffer] as any
            );
            return;
          }
        }

        throw new Error('OffscreenCanvas not supported in this worker context.');
      }

      case 'PREPARE_ML_TENSOR': {
        // Prepares normalized Float32Array [1, 3, targetH, targetW] for MobileNetV2 / local ML
        const { imageBitmap, targetSize = 224, normalize = true } = payload;
        const width = targetSize;
        const height = targetSize;

        if (typeof OffscreenCanvas === 'undefined') {
          throw new Error('OffscreenCanvas required for tensor preparation in worker.');
        }

        const offscreen = new OffscreenCanvas(width, height);
        const ctx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Could not get 2D context on OffscreenCanvas');

        ctx.drawImage(imageBitmap, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const rawPixels = imageData.data; // RGBA uint8 array

        // ImageNet normalization constants
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        const pixelCount = width * height;
        // Channel-first planar format (CHW: 3 x H x W)
        const floatData = new Float32Array(3 * pixelCount);

        for (let i = 0; i < pixelCount; i++) {
          const r = rawPixels[i * 4] / 255.0;
          const g = rawPixels[i * 4 + 1] / 255.0;
          const b = rawPixels[i * 4 + 2] / 255.0;

          if (normalize) {
            floatData[i] = (r - mean[0]) / std[0]; // Channel R
            floatData[pixelCount + i] = (g - mean[1]) / std[1]; // Channel G
            floatData[2 * pixelCount + i] = (b - mean[2]) / std[2]; // Channel B
          } else {
            floatData[i] = r;
            floatData[pixelCount + i] = g;
            floatData[2 * pixelCount + i] = b;
          }
        }

        self.postMessage(
          {
            id,
            type,
            success: true,
            result: {
              tensorBuffer: floatData.buffer,
              shape: [1, 3, height, width],
              dataType: 'float32',
            },
          },
          [floatData.buffer] as any
        );
        break;
      }

      case 'ASYNC_PARSE_JSON': {
        const { jsonString } = payload;
        const parsed = JSON.parse(jsonString);
        self.postMessage({ id, type, success: true, result: parsed });
        break;
      }

      default:
        throw new Error(`Unknown worker task type: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      type,
      success: false,
      error: err?.message || 'Worker task execution failed',
    });
  }
};
