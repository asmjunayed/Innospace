import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Monitor, Smartphone, Info } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface Props {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<Props> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showManualGuide, setShowManualGuide] = useState(false);

  // If already running in standalone mode (already installed), hide completely
  if (isInstalled) {
    return null;
  }

  // Click handler
  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        // If dismissed or failed, show manual guide as fallback
        setShowManualGuide(true);
      }
    } else {
      setShowManualGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-lg bg-emerald-600 font-semibold text-white shadow-md shadow-emerald-950/40 hover:bg-emerald-500 active:scale-95 transition shrink-0 ${
          compact ? 'px-2 sm:px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        }`}
        title="Install FieldVerify on this device"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap hidden sm:inline">Install FieldVerify</span>
        <span className="whitespace-nowrap sm:hidden">Install</span>
      </button>

      {/* Manual Installation Guide Modal (for browsers without beforeinstallprompt or iOS Safari) */}
      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                Install FieldVerify
              </h3>
              <button
                type="button"
                onClick={() => setShowManualGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Install <strong>FieldVerify</strong> to launch it as a standalone app with offline support and zero browser address bar distractions.
            </p>

            {/* Platform Instructions */}
            <div className="space-y-2.5 text-xs">
              {isIOS ? (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sky-400">
                    <Smartphone className="w-4 h-4" />
                    <span>iPhone / iPad (Safari)</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-slate-300">
                    <Share2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>1. Tap the <strong>Share</strong> button at the bottom toolbar.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-slate-300">
                    <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-400">
                    <Monitor className="w-4 h-4" />
                    <span>Chrome, Edge, Android or Desktop</span>
                  </div>
                  <p className="text-slate-300">
                    1. Look for the <strong>Install</strong> icon in your browser address bar (top right), or open your browser menu (<strong>⋮</strong>).
                  </p>
                  <p className="text-slate-300">
                    2. Select <strong>Install FieldVerify</strong> or <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Once installed, FieldVerify runs in standalone mode and works offline using local IndexedDB.</span>
            </div>

            <button
              type="button"
              onClick={() => setShowManualGuide(false)}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition shadow-md"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
