/**
 * Image Worker Client & Concurrency Dispatcher
 * Krishi-Drishti Concurrency Architecture
 *
 * Offloads heavy operations (Base64 encoding/decoding, image compression,
 * ML tensor preparation, and large JSON parsing) to a background Web Worker.
 *
 * Integrates directly with `processedImageCache` (LRUCache) to prevent redundant
 * re-computation and memory bloat.
 */

import { processedImageCache } from './lruCache';

export class ImageWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private requestIdCounter = 0;
  private workerAvailable = true;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof Worker === 'undefined') {
      console.warn('[ImageWorkerClient] Web Workers not available, using asynchronous main thread fallback');
      this.workerAvailable = false;
      return;
    }

    try {
      // In Vite, new Worker(new URL(..., import.meta.url), { type: 'module' }) bundles correctly
      this.worker = new Worker(
        new URL('../workers/imageWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event) => {
        const { id, success, result, error } = event.data;
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error || 'Worker execution failed'));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.error('[ImageWorkerClient] Worker error:', err);
      };
    } catch (e) {
      console.warn('[ImageWorkerClient] Failed to initialize worker, falling back to main thread async:', e);
      this.workerAvailable = false;
    }
  }

  private dispatch<T>(type: string, payload: any, transferList: Transferable[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.workerAvailable) {
        // Fallback to async execution on main thread
        this.fallbackExecute(type, payload).then(resolve).catch(reject);
        return;
      }

      const id = `req_${++this.requestIdCounter}_${Date.now()}`;
      this.pendingRequests.set(id, { resolve, reject });

      try {
        this.worker.postMessage({ id, type, payload }, transferList);
      } catch (postErr) {
        // If transfer fails, retry without transfer or fallback
        this.pendingRequests.delete(id);
        this.fallbackExecute(type, payload).then(resolve).catch(reject);
      }
    });
  }

  /**
   * Offloads Base64 Data URI -> Blob conversion to worker.
   * Eliminates the UI thread `atob` and character iteration freeze.
   */
  async dataUriToBlob(dataUri: string): Promise<Blob> {
    // Check if result is already in LRU cache
    const cached = processedImageCache.get(dataUri);
    if (cached instanceof Blob) {
      return cached;
    }

    const res: any = await this.dispatch('DATA_URI_TO_BLOB', { dataUri });
    const blob = new Blob([res.arrayBuffer], { type: res.mime || 'image/jpeg' });
    processedImageCache.put(dataUri, blob, { sizeBytes: blob.size });
    return blob;
  }

  /**
   * Offloads image resizing, cropping, and JPEG encoding to the worker thread.
   */
  async resizeAndEncode(
    source: ImageBitmap | Blob,
    targetWidth = 224,
    targetHeight = 224,
    quality = 0.85
  ): Promise<Blob> {
    let bitmap: ImageBitmap;
    if (source instanceof Blob) {
      bitmap = await createImageBitmap(source);
    } else {
      bitmap = source;
    }

    const res: any = await this.dispatch(
      'RESIZE_AND_ENCODE',
      { imageBitmap: bitmap, targetWidth, targetHeight, quality },
      [bitmap]
    );

    return new Blob([res.arrayBuffer], { type: res.mime });
  }

  /**
   * Prepares normalized ML float32 tensors [1, 3, targetSize, targetSize]
   * for local / edge neural network inference without blocking UI animations.
   */
  async prepareMLTensor(
    source: ImageBitmap | Blob,
    targetSize = 224
  ): Promise<{ tensorData: Float32Array; shape: number[] }> {
    let bitmap: ImageBitmap;
    if (source instanceof Blob) {
      bitmap = await createImageBitmap(source);
    } else {
      bitmap = source;
    }

    const res: any = await this.dispatch(
      'PREPARE_ML_TENSOR',
      { imageBitmap: bitmap, targetSize, normalize: true },
      [bitmap]
    );

    return {
      tensorData: new Float32Array(res.tensorBuffer),
      shape: res.shape,
    };
  }

  /**
   * Offloads large JSON parsing from the main thread.
   */
  async parseJson<T>(jsonString: string): Promise<T> {
    return this.dispatch<T>('ASYNC_PARSE_JSON', { jsonString });
  }

  /**
   * Asynchronous fallback on main thread if Web Worker is unavailable.
   */
  private async fallbackExecute(type: string, payload: any): Promise<any> {
    // Yield to let any pending UI renders flush
    await new Promise((r) => setTimeout(r, 0));

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
        return { arrayBuffer: bytes.buffer, mime, size: len };
      }

      case 'ASYNC_PARSE_JSON': {
        return JSON.parse(payload.jsonString);
      }

      default:
        throw new Error(`Fallback for ${type} not supported on main thread.`);
    }
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Global Singleton Image Worker Client
export const imageWorkerClient = new ImageWorkerClient();
