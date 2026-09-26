import { useEffect, useState, useCallback } from 'react';

// Global variable and listeners for offline simulation across the entire app
let globalSimulatedOffline = false;
const listeners = new Set<(val: boolean) => void>();

export function setSimulatedOfflineState(val: boolean) {
  globalSimulatedOffline = val;
  listeners.forEach((listener) => listener(val));
}

export function useOnlineStatus() {
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(globalSimulatedOffline);

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const onSimulateChange = (val: boolean) => setSimulatedOffline(val);
    listeners.add(onSimulateChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      listeners.delete(onSimulateChange);
    };
  }, []);

  const toggleSimulateOffline = useCallback(() => {
    setSimulatedOfflineState(!globalSimulatedOffline);
  }, []);

  const setSimulate = useCallback((val: boolean) => {
    setSimulatedOfflineState(val);
  }, []);

  // Effective online status: false if real offline OR simulated offline
  const isOnline = browserOnline && !simulatedOffline;

  return {
    isOnline,
    browserOnline,
    isSimulatedOffline: simulatedOffline,
    toggleSimulateOffline,
    setSimulateOffline: setSimulate,
  };
}
