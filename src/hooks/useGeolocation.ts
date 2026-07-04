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

const useGeolocation = (): GeolocationHook => {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<string | null>(null);
  const positionCallbackRef = useRef<((pos: Position) => void) | undefined>();

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (!('capacitor' in window)) {
        return true;
      }
      const permissionStatus = await Geolocation.requestPermissions();
      if (permissionStatus.location === 'granted' || permissionStatus.location === 'prompt') {
        return true;
      } else {
        setError('Location permission denied.');
        return false;
      }
    } catch (err) {
      console.warn('Capacitor Geolocation permissions failed, falling back:', err);
      return true;
    }
  };

  const getCurrentLocation = async (): Promise<Position | null> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;
      
      try {
        // Try High Accuracy (GPS) first for mobile
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        setPosition(pos);
        return pos;
      } catch (highAccErr) {
        // Fallback to Wi-Fi triangulation (Crucial for Desktop/Windows 11)
        console.warn('High accuracy failed, trying Wi-Fi triangulation...', highAccErr);
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
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
      // For desktop tracking, we should also allow fallback, but capacitor watchPosition doesn't fallback automatically.
      // Since they are just testing, we will use a more forgiving timeout.
      watchId.current = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        async (pos, err) => {
          if (err) {
            console.warn("[useGeolocation] High Acc Watch Error, restarting with Wi-Fi only:", err);
            // If it fails, stop this watch and restart with low accuracy
            stopTracking();
            watchId.current = await Geolocation.watchPosition(
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 },
                (lowPos, lowErr) => {
                    if (lowPos) {
                        setPosition(lowPos);
                        if (positionCallbackRef.current) positionCallbackRef.current(lowPos);
                    }
                }
            );
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
