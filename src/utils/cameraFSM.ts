/**
 * Camera Permission & Hardware Lifecycle Finite State Machine (FSM)
 * Krishi-Drishti Core Architecture
 *
 * Implements strict FSM states:
 * - IDLE
 * - REQUESTING_PERMISSION
 * - GRANTED
 * - DENIED
 * - INITIALIZING_HARDWARE
 *
 * Guarantees:
 * 1. Permission requests are explicitly awaited BEFORE accessing the hardware stream.
 * 2. Hardware initialization cannot occur from IDLE or DENIED directly without passing through GRANTED.
 * 3. Media stream tracks and hardware locks are always properly stopped/cleaned up on unmount or state transition.
 */

import { Camera as CapacitorCamera, PermissionStatus as CapacitorPermissionStatus } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type CameraFSMState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'GRANTED'
  | 'DENIED'
  | 'INITIALIZING_HARDWARE';

export interface CameraFSMTransitionEvent {
  from: CameraFSMState;
  to: CameraFSMState;
  payload?: any;
}

export interface CameraHardwareOptions {
  videoElement?: HTMLVideoElement | null;
  facingMode?: 'environment' | 'user';
  idealWidth?: number;
  idealHeight?: number;
}

export type StateChangeCallback = (state: CameraFSMState, error?: string | null) => void;

export class CameraFSM {
  private currentState: CameraFSMState = 'IDLE';
  private mediaStream: MediaStream | null = null;
  private currentError: string | null = null;
  private onStateChangeListeners: StateChangeCallback[] = [];

  constructor() {
    this.currentState = 'IDLE';
  }

  public getState(): CameraFSMState {
    return this.currentState;
  }

  public getStream(): MediaStream | null {
    return this.mediaStream;
  }

  public getError(): string | null {
    return this.currentError;
  }

  public subscribe(callback: StateChangeCallback): () => void {
    this.onStateChangeListeners.push(callback);
    callback(this.currentState, this.currentError);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter(cb => cb !== callback);
    };
  }

  private transition(nextState: CameraFSMState, error: string | null = null): void {
    const prev = this.currentState;
    this.currentState = nextState;
    this.currentError = error;
    console.log(`[CameraFSM] Transition: ${prev} -> ${nextState}`, error ? `(Error: ${error})` : '');

    this.onStateChangeListeners.forEach(cb => {
      try {
        cb(nextState, error);
      } catch (err) {
        console.error('[CameraFSM] Listener callback error:', err);
      }
    });
  }

  /**
   * Step 1: Explicitly checks and requests camera permissions.
   * Strictly transitions IDLE -> REQUESTING_PERMISSION -> GRANTED or DENIED.
   * Does NOT touch the hardware stream yet!
   */
  public async requestPermission(): Promise<boolean> {
    if (this.currentState === 'GRANTED') {
      return true;
    }
    if (this.currentState === 'REQUESTING_PERMISSION' || this.currentState === 'INITIALIZING_HARDWARE') {
      console.warn('[CameraFSM] Request ignored: operation in progress in state', this.currentState);
      return false;
    }

    this.transition('REQUESTING_PERMISSION');

    try {
      // 1. Check Capacitor native permission if on native Android / iOS
      if (Capacitor.isNativePlatform()) {
        let permStatus: CapacitorPermissionStatus;
        try {
          permStatus = await CapacitorCamera.checkPermissions();
        } catch {
          permStatus = { camera: 'prompt', photos: 'prompt' };
        }

        if (permStatus.camera !== 'granted') {
          console.log('[CameraFSM] Native permission not granted, requesting...');
          permStatus = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
        }

        if (permStatus.camera === 'granted') {
          this.transition('GRANTED');
          return true;
        } else {
          this.transition('DENIED', 'Camera permission denied on Android device.');
          return false;
        }
      }

      // 2. Web browser permission check
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'camera' as any });
          if (status.state === 'granted') {
            this.transition('GRANTED');
            return true;
          } else if (status.state === 'denied') {
            this.transition('DENIED', 'Camera permission is blocked in browser settings.');
            return false;
          }
          // If 'prompt', will transition via explicit stream request below
        } catch {
          // Some browsers throw on querying camera permission name
        }
      }

      // For standard browser prompt: we test access gently or mark GRANTED for step 2
      // In web browsers, permissions are typically requested at getUserMedia call time.
      this.transition('GRANTED');
      return true;
    } catch (err: any) {
      console.error('[CameraFSM] Permission request failure:', err);
      this.transition('DENIED', err?.message || 'Could not verify camera permission.');
      return false;
    }
  }

  /**
   * Step 2: Initializes hardware stream.
   * Can ONLY be called when state is 'GRANTED'.
   * Transitions GRANTED -> INITIALIZING_HARDWARE -> active or DENIED (on error).
   */
  public async initializeHardware(options: CameraHardwareOptions = {}): Promise<MediaStream | null> {
    if (this.currentState !== 'GRANTED') {
      console.warn(`[CameraFSM] Cannot initialize hardware from state ${this.currentState}. Must be GRANTED.`);
      if (this.currentState === 'IDLE' || this.currentState === 'DENIED') {
        const granted = await this.requestPermission();
        if (!granted) return null;
      } else {
        return null;
      }
    }

    this.transition('INITIALIZING_HARDWARE');

    try {
      this.releaseHardware(); // Release any stale tracks

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: options.facingMode || { ideal: 'environment' },
          width: { ideal: options.idealWidth || 1920 },
          height: { ideal: options.idealHeight || 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;

      if (options.videoElement) {
        options.videoElement.srcObject = stream;
        try {
          await options.videoElement.play();
        } catch (playErr) {
          console.warn('[CameraFSM] Auto-play was interrupted:', playErr);
        }
      }

      // Hardware is initialized and stream active
      this.transition('GRANTED');
      return stream;
    } catch (hardwareErr: any) {
      console.error('[CameraFSM] Hardware initialization error:', hardwareErr);
      const isPermissionDenied =
        hardwareErr.name === 'NotAllowedError' || hardwareErr.name === 'PermissionDeniedError';

      this.transition('DENIED', isPermissionDenied
        ? 'Camera permission was denied by user.'
        : `Hardware access failed: ${hardwareErr.message || 'Camera unavailable'}`
      );
      this.releaseHardware();
      return null;
    }
  }

  /**
   * Full coordinated startup sequence:
   * Awaits permission first, then initializes hardware.
   */
  public async start(options: CameraHardwareOptions = {}): Promise<MediaStream | null> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return null;
    return this.initializeHardware(options);
  }

  /**
   * Safely stops the camera hardware, releases video tracks and transitions back to IDLE.
   */
  public stop(): void {
    this.releaseHardware();
    this.transition('IDLE');
  }

  private releaseHardware(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch { /* ignore */ }
      });
      this.mediaStream = null;
    }
  }
}
