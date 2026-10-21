/**
 * useCameraFSM React Hook
 * Krishi-Drishti Camera State Management
 *
 * Wraps CameraFSM with idiomatic React lifecycle guarantees:
 * - Reactive state updates across all FSM transitions.
 * - Explicitly prevents race conditions on rapid mount/unmount.
 * - Guarantees hardware release when screen unmounts.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraFSM, CameraFSMState, CameraHardwareOptions } from '../utils/cameraFSM';

export interface UseCameraFSMReturn {
  fsmState: CameraFSMState;
  stream: MediaStream | null;
  error: string | null;
  start: (options?: CameraHardwareOptions) => Promise<MediaStream | null>;
  stop: () => void;
  retry: (options?: CameraHardwareOptions) => Promise<MediaStream | null>;
}

export function useCameraFSM(autoStart = false, defaultOptions: CameraHardwareOptions = {}): UseCameraFSMReturn {
  const fsmRef = useRef<CameraFSM | null>(null);
  if (!fsmRef.current) {
    fsmRef.current = new CameraFSM();
  }

  const [fsmState, setFsmState] = useState<CameraFSMState>(fsmRef.current.getState());
  const [stream, setStream] = useState<MediaStream | null>(fsmRef.current.getStream());
  const [error, setError] = useState<string | null>(fsmRef.current.getError());

  const optionsRef = useRef(defaultOptions);
  optionsRef.current = defaultOptions;

  useEffect(() => {
    const fsm = fsmRef.current!;
    const unsubscribe = fsm.subscribe((state, err) => {
      setFsmState(state);
      setStream(fsm.getStream());
      setError(err || null);
    });

    if (autoStart) {
      fsm.start(optionsRef.current).catch(e => {
        console.error('[useCameraFSM] Auto-start failure:', e);
      });
    }

    return () => {
      unsubscribe();
      fsm.stop();
    };
  }, [autoStart]);

  const start = useCallback(async (options?: CameraHardwareOptions) => {
    return fsmRef.current!.start(options || optionsRef.current);
  }, []);

  const stop = useCallback(() => {
    fsmRef.current!.stop();
  }, []);

  const retry = useCallback(async (options?: CameraHardwareOptions) => {
    fsmRef.current!.stop();
    return fsmRef.current!.start(options || optionsRef.current);
  }, []);

  return {
    fsmState,
    stream,
    error,
    start,
    stop,
    retry,
  };
}
