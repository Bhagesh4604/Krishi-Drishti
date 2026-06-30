/**
 * AnalysisProgress — Krishi-Drishti
 * ====================================
 * Animated component shown while a GEE Celery job is running.
 * Displays satellite icon, animated radar wave, elapsed time, and a
 * pulsing progress bar.
 *
 * Usage:
 *   <AnalysisProgress
 *     jobId={jobId}
 *     onComplete={(result) => setAnalysis(result)}
 *     onError={(msg) => setError(msg)}
 *   />
 */

import React, { useEffect, useState } from 'react';
import { useJobPoller, JobPollerOptions } from '../hooks/useJobPoller';

interface AnalysisProgressProps<T = any> {
  jobId: string | null;
  title?: string;
  subtitle?: string;
  onComplete?: (result: T) => void;
  onError?: (error: string) => void;
}

const STAGE_LABELS: { threshold: number; label: string }[] = [
  { threshold:  0, label: 'Connecting to satellite...'          },
  { threshold: 10, label: 'Fetching Sentinel-2 imagery...'      },
  { threshold: 30, label: 'Computing NDVI & EVI indices...'     },
  { threshold: 50, label: 'Querying NASA SMAP soil moisture...' },
  { threshold: 70, label: 'Calculating carbon sequestration...' },
  { threshold: 85, label: 'Finalising analysis...'              },
];

function getStageLabel(progress: number): string {
  let label = STAGE_LABELS[0].label;
  for (const stage of STAGE_LABELS) {
    if (progress >= stage.threshold) label = stage.label;
  }
  return label;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function AnalysisProgress<T = any>({
  jobId,
  onComplete,
  onError,
  title = 'Satellite Analysis Running',
  subtitle = 'Fetching real-time data from Google Earth Engine',
}: AnalysisProgressProps<T>) {
  const { status, progress, elapsedMs } = useJobPoller<T>(jobId, { onComplete, onError });
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(id);
  }, []);

  if (!jobId || status === 'idle' || status === 'success') return null;

  const isError = status === 'failed' || status === 'timeout';
  const stageLabel = isError ? 'Analysis failed' : getStageLabel(progress);

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Animated satellite icon */}
        <div style={styles.iconRing}>
          <div style={styles.radarPulse} />
          <div style={styles.radarPulse2} />
          <span style={styles.icon}>🛰️</span>
        </div>

        <h3 style={{ ...styles.title, color: isError ? '#ef4444' : '#22c55e' }}>
          {isError ? '⚠️ Analysis Failed' : title}
          {!isError && <span style={{ color: '#6b7280' }}>{dots}</span>}
        </h3>

        <p style={styles.subtitle}>
          {isError ? 'Using cached / simulated data as fallback.' : subtitle}
        </p>

        {/* Progress bar */}
        {!isError && (
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${Math.max(5, progress)}%`,
              }}
            />
          </div>
        )}

        {/* Stage label */}
        <p style={styles.stage}>{stageLabel}</p>

        {/* Elapsed time */}
        <p style={styles.elapsed}>
          {isError ? '' : `⏱ ${formatElapsed(elapsedMs)} elapsed`}
        </p>
      </div>
    </div>
  );
}

// ── Inline styles (no extra CSS file needed) ──────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  card: {
    background: 'linear-gradient(135deg, #0f1e14 0%, #0a1a0f 100%)',
    border: '1px solid #1f4d2a',
    borderRadius: 20,
    padding: '40px 36px',
    maxWidth: 380,
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,197,94,0.1)',
  },
  iconRing: {
    position: 'relative',
    width: 80,
    height: 80,
    margin: '0 auto 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: '2px solid rgba(34,197,94,0.5)',
    animation: 'radar-pulse 2s ease-out infinite',
  },
  radarPulse2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: '2px solid rgba(34,197,94,0.3)',
    animation: 'radar-pulse 2s ease-out 1s infinite',
  },
  icon: {
    fontSize: 36,
    position: 'relative',
    zIndex: 1,
    animation: 'satellite-orbit 8s linear infinite',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    margin: '0 0 20px',
    lineHeight: 1.5,
  },
  progressTrack: {
    height: 6,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #16a34a, #4ade80)',
    borderRadius: 99,
    transition: 'width 0.6s ease',
    boxShadow: '0 0 10px rgba(74,222,128,0.5)',
  },
  stage: {
    fontSize: 12,
    color: '#4ade80',
    margin: '0 0 6px',
    fontFamily: 'monospace',
  },
  elapsed: {
    fontSize: 11,
    color: '#374151',
    margin: 0,
  },
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('kd-analysis-keyframes')) {
  const style = document.createElement('style');
  style.id = 'kd-analysis-keyframes';
  style.textContent = `
    @keyframes radar-pulse {
      0%   { transform: scale(1);   opacity: 0.7; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes satellite-orbit {
      0%   { transform: rotate(0deg)   translateX(4px) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(4px) rotate(-360deg); }
    }
  `;
  document.head.appendChild(style);
}
