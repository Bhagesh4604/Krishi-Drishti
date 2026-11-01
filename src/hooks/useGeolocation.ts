import { useState, useEffect, useRef } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';

interface GeolocationHook {
  position: Position | null;
  error: string | null;
  startTracking: (callback?: (pos: Position) => void) => Promise<void>;
  stopTracking: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  getCurrentLocation: () => Promise<Position | null>;
}

import { Capacitor } from '@capacitor/core';

const useGeolocation = (): GeolocationHook => {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<string | null>(null);
  const positionCallbackRef = useRef<((pos: Position) => void) | undefined>();

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (!Capacitor.isNativePlatform()) {
        const available = typeof navigator !== 'undefined' && 'geolocation' in navigator;
        if (!available) setError('Location is unavailable in this browser. Use HTTPS or the installed app.');
        return available;
      }

      const currentStatus = await Geolocation.checkPermissions();
      if (currentStatus.location === 'granted') {
        return true;
      }
      if (currentStatus.location === 'denied') {
        setError('Location permission is blocked. Enable it for Krishi-Drishti in app settings, then retry.');
        return false;
      }

      const requestedStatus = await Geolocation.requestPermissions();
      if (requestedStatus.location === 'granted') return true;

      setError('Location permission was not granted. Allow it in app settings, then retry.');
      return false;
    } catch (err) {
      console.warn('Capacitor Geolocation permissions failed, falling back:', err);
      return true;
    }
  };

  const getCurrentLocation = async (): Promise<Position | null> => {
    setError(null);
    try {
      if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Location requires HTTPS or localhost.');
      }

      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;
      
      try {
        // Try High Accuracy (GPS) first for mobile
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
        setPosition(pos);
        return pos;
      } catch (highAccErr) {
        const errorCode = Number((highAccErr as { code?: number })?.code);
        const errorMessage = String((highAccErr as { message?: string })?.message || '');
        if (errorCode === 1 || /permission|denied/i.test(errorMessage)) throw highAccErr;

        // Fallback to Wi-Fi triangulation (Crucial for Desktop/Windows 11)
        console.warn('High accuracy failed, trying Wi-Fi triangulation...', highAccErr);
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
        setPosition(pos);
        return pos;
      }
    } catch (err: any) {
      console.error('getCurrentLocation Error:', err);
      setError(err.message || 'Failed to get location');
      return null;
    }
  };

  const startTracking = async (callback?: (pos: Position) => void) => {
    positionCallbackRef.current = callback;
    setError(null);

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (watchId.current !== null) {
      try { await Geolocation.clearWatch({ id: watchId.current }); } catch (e) { }
      watchId.current = null;
    }

    try {
      console.log("[useGeolocation] Starting Capacitor Watch...");
      // For precise tracking (Land Marking), we MUST use high accuracy (GPS).
      // Give the GPS chip plenty of time to lock on (e.g., 60 seconds)
      watchId.current = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 },
        async (pos, err) => {
          if (err) {
            console.warn("[useGeolocation] High Acc Watch Error:", err);
            // Do NOT fallback to low accuracy here, otherwise the user's area will be drawn 1.5km away.
            // Just let it retry or fail gracefully.
            return;
          }
          if (pos) {
            setPosition(pos);
            if (positionCallbackRef.current) {
              positionCallbackRef.current(pos);
            }
          }
        }
      );
    } catch (err: any) {
      console.error("[useGeolocation] Watch failed:", err);
      setError("Failed to start location tracking.");
    }
  };

  const stopTracking = async () => {
    if (watchId.current !== null) {
      try {
        await Geolocation.clearWatch({ id: watchId.current });
        watchId.current = null;
        console.log('[useGeolocation] Tracking stopped.');
      } catch (err) {
        console.warn('Could not clear geolocation watch:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return { position, error, startTracking, stopTracking, requestPermissions, getCurrentLocation };
};

export default useGeolocation;
