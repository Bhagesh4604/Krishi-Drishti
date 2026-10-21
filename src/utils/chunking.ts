/**
 * Chunking and Pagination Utilities
 * Krishi-Drishti Data Structures & Algorithms (DSA) Module
 *
 * Prevents UI thread blocking and memory spikes caused by monolithic datasets
 * by partitioning large arrays and data streams into fixed-size buffers.
 */

/**
 * Splits a monolithic array into fixed-size chunks (buffers).
 * Space Complexity: O(N) referencing original elements.
 * Time Complexity: O(N).
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) throw new Error("chunkSize must be greater than 0");
  if (!items || items.length === 0) return [];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Iterates through large datasets in chunked buffers, yielding control back to the
 * browser's UI thread / event loop after each chunk to maintain 60 FPS responsiveness.
 */
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[], chunkIndex: number) => Promise<R[]> | R[],
  yieldMs = 0
): Promise<R[]> {
  const chunks = chunkArray(items, chunkSize);
  const results: R[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkResult = await processor(chunks[i], i);
    results.push(...chunkResult);

    // Yield to the browser main thread
    if (i < chunks.length - 1) {
      await yieldToMain(yieldMs);
    }
  }

  return results;
}

/**
 * Microtask / Macrotask boundary yielding.
 * Allows the browser to process input events, layout, and frame renders.
 */
export function yieldToMain(delayMs = 0): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined' && delayMs === 0) {
      // Coordinate with next animation frame
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, delayMs);
    }
  });
}

/**
 * Generic Paginated Buffer Manager
 * Useful for lazy-loading APMC market listings, historical logs, or sensor events.
 */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class PaginatedBuffer<T> {
  private buffer: T[] = [];
  private pageSize: number;

  constructor(initialData: T[] = [], pageSize = 20) {
    this.buffer = [...initialData];
    this.pageSize = Math.max(1, pageSize);
  }

  setBuffer(items: T[]): void {
    this.buffer = [...items];
  }

  appendChunk(items: T[]): void {
    this.buffer.push(...items);
  }

  getPage(pageIndex: number): PaginatedResult<T> {
    const totalItems = this.buffer.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));
    const normalizedPage = Math.max(1, Math.min(pageIndex, totalPages));

    const startIndex = (normalizedPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalItems);
    const data = this.buffer.slice(startIndex, endIndex);

    return {
      data,
      page: normalizedPage,
      pageSize: this.pageSize,
      totalItems,
      totalPages,
      hasNext: normalizedPage < totalPages,
      hasPrev: normalizedPage > 1,
    };
  }

  get totalItems(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}
