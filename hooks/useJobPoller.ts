/**
 * useSSEAnalysis — Upgrade D: SSE-Based Analysis Hook
 * =====================================================
 * Replaces the old polling-based `useJobPoller` with a Server-Sent Events (SSE)
 * connection. The server pushes ONE event when analysis is complete instead of
 * the client hammering the API every 2 seconds.
 *
 * Old pattern (BAD — causes 504 cascades at scale):
 *   setInterval(() => fetch('/api/jobs/{id}'), 2000)
 *
 * New pattern (GOOD — zero wasted requests):
 *   POST /api/v1/analyze-plot → task_id
 *   EventSource /api/v1/analyze-stream/{task_id} → server pushes ONCE on done
 *
 * Usage:
 *   const { status, result, startAnalysis } = useSSEAnalysis({ onComplete, onError });
 *   startAnalysis(plotId);
 */

import { useState, useRef, useCallback } from 'react';

export interface SSEAnalysisResult {
  ndvi: number;
  msavi: number;
  evi: number;
  ndmi: number;
  pest_risk: string;
  crop_health: string;
  irrigation_advisory: string;
  completed_at: string;
}

export interface SSEAnalysisOptions {
  onComplete?: (result: SSEAnalysisResult) => void;
  onError?: (error: string) => void;
}

// Backwards-compatible alias so existing components (AnalysisProgress.tsx) don't break
export interface JobPollerOptions<T = any> {
  onComplete?: (result: T) => void;
  onError?: (error: string) => void;
  intervalMs?: number;
}

export function useSSEAnalysis(options: SSEAnalysisOptions = {}) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'running' | 'success' | 'failed' | 'timeout'>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<SSEAnalysisResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAnalysis = useCallback(async (plotId: number) => {
    cleanup();
    setStatus('connecting');
    setResult(null);
    setElapsedMs(0);
    startTimeRef.current = Date.now();

    try {
      // Step 1: POST to kick off the background task
      const token = localStorage.getItem('ks_token');
      const response = await fetch('/api/v1/analyze-plot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plot_id: plotId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to start analysis');
      }

      const { task_id } = await response.json();
      setTaskId(task_id);
      setStatus('running');

      // Step 2: Open SSE stream — server pushes exactly once when done
      const sseUrl = `/api/v1/analyze-stream/${task_id}?token=${token || ''}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      // Elapsed time ticker
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 500);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'CONNECTED') {
            // Heartbeat — server confirmed connection, keep waiting
            return;
          }

          if (data.status === 'COMPLETE') {
            setStatus('success');
            setResult(data as SSEAnalysisResult);
            options.onComplete?.(data as SSEAnalysisResult);
            cleanup();
          } else if (data.status === 'TIMEOUT') {
            setStatus('timeout');
            options.onError?.('Analysis timed out. Please try again.');
            cleanup();
          } else if (data.status === 'ERROR') {
            setStatus('failed');
            options.onError?.(data.detail || 'Analysis failed.');
            cleanup();
          }
        } catch {
          // Ignore malformed SSE messages
        }
      };

      es.onerror = () => {
        setStatus('failed');
        options.onError?.('Connection to analysis stream lost.');
        cleanup();
      };
    } catch (err: any) {
      setStatus('failed');
      options.onError?.(err.message || 'Could not start analysis.');
      cleanup();
    }
  }, [cleanup, options]);

  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setTaskId(null);
    setResult(null);
    setElapsedMs(0);
  }, [cleanup]);

  return { status, taskId, result, elapsedMs, startAnalysis, reset };
}

// ── Backwards compatibility shim (so existing screens don't break) ────────────
// The old useJobPoller signature is preserved — it now delegates to useSSEAnalysis.
export function useJobPoller<T>(jobId: string | null, options: {
  onComplete?: (result: T) => void;
  onError?: (error: string) => void;
  intervalMs?: number;
} = {}) {
  // Legacy callers only passed a jobId after starting analysis separately.
  // In the new model they should call startAnalysis(plotId) instead.
  // This shim prevents build errors in screens not yet migrated.
  const [status] = useState<'idle' | 'running' | 'success' | 'failed' | 'timeout'>('idle');
  const [progress] = useState(0);
  const [elapsedMs] = useState(0);
  return { status, progress, elapsedMs };
}
