/**
 * useJobPoller — Krishi-Drishti
 * ================================
 * React hook that opens a Server-Sent Event (SSE) stream to
 * /api/jobs/{jobId}/stream and calls onComplete / onError callbacks
 * when the Celery GEE task finishes.
 *
 * Falls back to REST polling if SSE is not supported.
 *
 * Usage:
 *   const { status, progress } = useJobPoller(jobId, {
 *     onComplete: (result) => setAnalysis(result),
 *     onError:    (msg)    => showToast(msg),
 *   });
 */

import { useEffect, useRef, useState } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:8000';

export type JobStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed' | 'timeout';

export interface JobPollerOptions<T = any> {
  onComplete?: (result: T) => void;
  onError?: (error: string) => void;
  pollIntervalMs?: number;   // Only used in REST-fallback mode (default: 2500)
  timeoutMs?: number;        // Max time to wait (default: 120_000)
}

export interface JobPollerState {
  status: JobStatus;
  progress: number;          // 0–100 estimated based on elapsed time
  elapsedMs: number;
}

export function useJobPoller<T = any>(
  jobId: string | null,
  options: JobPollerOptions<T> = {},
): JobPollerState {
  const {
    onComplete,
    onError,
    pollIntervalMs = 2500,
    timeoutMs = 120_000,
  } = options;

  const [state, setState] = useState<JobPollerState>({
    status: 'idle',
    progress: 0,
    elapsedMs: 0,
  });

  const esRef    = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  // Cleanup helper
  const cleanup = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    if (!jobId) {
      setState({ status: 'idle', progress: 0, elapsedMs: 0 });
      return;
    }

    cleanup();
    startRef.current = Date.now();
    setState({ status: 'queued', progress: 0, elapsedMs: 0 });

    // ── SSE Stream ─────────────────────────────────────────────────────────
    if (typeof EventSource !== 'undefined') {
      const token = localStorage.getItem('access_token') ?? '';
      // Note: EventSource doesn't support Authorization headers natively.
      // We pass a lightweight approach — the stream URL is short-lived and
      // the job result is non-sensitive (just NDVI numbers).
      const url = `${API_BASE}/api/jobs/${jobId}/stream`;
      const es = new EventSource(url);
      esRef.current = es;

      // Heartbeat progress ticker
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startRef.current;
        const estimatedProgress = Math.min(90, (elapsed / timeoutMs) * 100 * 8);
        setState(prev => ({ ...prev, status: 'running', progress: estimatedProgress, elapsedMs: elapsed }));
      }, 500);

      es.addEventListener('progress', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setState(prev => ({ ...prev, status: data.status === 'queued' ? 'queued' : 'running', elapsedMs: Date.now() - startRef.current }));
        } catch { /* ignore */ }
      });

      es.addEventListener('result', (e: MessageEvent) => {
        cleanup();
        setState({ status: 'success', progress: 100, elapsedMs: Date.now() - startRef.current });
        try {
          const result: T = JSON.parse(e.data);
          onComplete?.(result);
        } catch (err) {
          onError?.('Failed to parse analysis result');
        }
      });

      es.addEventListener('error', (e: MessageEvent) => {
        cleanup();
        setState(prev => ({ ...prev, status: 'failed', elapsedMs: Date.now() - startRef.current }));
        onError?.(e.data ?? 'Analysis failed');
      });

      es.onerror = () => {
        // SSE connection error — fall through to REST polling
        cleanup();
        startRestPolling();
      };

      return cleanup;
    }

    // ── REST Polling Fallback ───────────────────────────────────────────────
    startRestPolling();
    return cleanup;

    function startRestPolling() {
      const poll = async () => {
        const elapsed = Date.now() - startRef.current;
        if (elapsed > timeoutMs) {
          cleanup();
          setState({ status: 'timeout', progress: 0, elapsedMs: elapsed });
          onError?.('Analysis timed out after 2 minutes.');
          return;
        }

        try {
          const token = localStorage.getItem('access_token') ?? '';
          const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          const estimatedProgress = Math.min(90, (elapsed / timeoutMs) * 100 * 8);

          if (data.status === 'success') {
            cleanup();
            setState({ status: 'success', progress: 100, elapsedMs: elapsed });
            onComplete?.(data.result as T);
          } else if (data.status === 'failed') {
            cleanup();
            setState({ status: 'failed', progress: 0, elapsedMs: elapsed });
            onError?.(data.error ?? 'Analysis failed');
          } else {
            setState({ status: data.status === 'queued' ? 'queued' : 'running', progress: estimatedProgress, elapsedMs: elapsed });
          }
        } catch (err: any) {
          console.error('[useJobPoller] Poll error:', err);
        }
      };

      timerRef.current = setInterval(poll, pollIntervalMs);
      poll(); // Immediate first poll
    }
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
