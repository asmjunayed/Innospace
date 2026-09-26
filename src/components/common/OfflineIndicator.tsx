import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, Database, CheckCircle2, X } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useToast } from '../../context/ToastContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isSimulatedOffline, toggleSimulateOffline } = useOnlineStatus();
  const { showToast } = useToast();
  
  // Track previous online state to detect transitions
  const prevOnlineRef = useRef<boolean>(isOnline);
  const isFirstMount = useRef<boolean>(true);
  const [reconnectBanner, setReconnectBanner] = useState<boolean>(false);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (!isOnline) {
        showToast('App started offline. Local IndexedDB is active — field visits and observations will save locally.', 'info');
      }
      prevOnlineRef.current = isOnline;
      return;
    }

    if (prevOnlineRef.current && !isOnline) {
      // Just went offline
      showToast('Network disconnected. Working offline — all visits and observations save to IndexedDB.', 'warning');
      setReconnectBanner(false);
    } else if (!prevOnlineRef.current && isOnline) {
      // Just reconnected
      setReconnectBanner(true);
      showToast('Network connection restored. Local IndexedDB remains primary store.', 'success');
      const timer = setTimeout(() => {
        setReconnectBanner(false);
      }, 4000);
      return () => clearTimeout(timer);
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline, showToast]);

  return (
    <>
      {/* Reconnected Banner */}
      {reconnectBanner && isOnline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-18 md:bottom-4 left-3 sm:left-4 z-40 max-w-sm flex items-center justify-between gap-3 rounded-xl bg-emerald-950/95 text-white border border-emerald-500/60 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-2xl transition"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-200">Back Online</p>
              <p className="text-[11px] text-slate-300">Local-first data preserved in browser IndexedDB.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReconnectBanner(false)}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Dismiss reconnection banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* Persistent Offline Badge when offline */}
      {!isOnline && (
        <aside 
          role="status" 
          aria-live="polite"
          className="fixed bottom-18 md:bottom-4 left-3 sm:left-4 z-40 max-w-sm flex items-center justify-between gap-3 rounded-xl bg-amber-950/95 text-white border border-amber-500/60 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-2xl transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-bold text-amber-200">
                <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Working Offline</span>
                {isSimulatedOffline && (
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-amber-800/80 text-amber-100">
                    Simulated
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-300 leading-tight">
                IndexedDB active. Field visits & observations save locally.
              </span>
            </div>
          </div>

          {isSimulatedOffline ? (
            <button
              type="button"
              onClick={toggleSimulateOffline}
              className="ml-1 text-[11px] font-semibold bg-amber-800 hover:bg-amber-700 px-2 py-1 rounded-lg border border-amber-600 text-amber-100 shrink-0 transition"
              title="Turn off simulated offline mode"
            >
              Go Online
            </button>
          ) : (
            <div className="p-1 rounded text-amber-400/80" title="Local IndexedDB storage enabled">
              <Database className="w-4 h-4" />
            </div>
          )}
        </aside>
      )}
    </>
  );
};
