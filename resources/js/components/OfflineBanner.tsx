import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [wasOffline, setWasOffline] = useState<boolean>(false);
    const [showRestored, setShowRestored] = useState<boolean>(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (wasOffline) {
                setShowRestored(true);
                const timer = setTimeout(() => {
                    setShowRestored(false);
                    setWasOffline(false);
                }, 3500);
                return () => clearTimeout(timer);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            setWasOffline(true);
            setShowRestored(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [wasOffline]);

    if (isOnline && !showRestored) {
        return null;
    }

    return (
        <div
            className={`w-full py-2 px-4 transition-all duration-300 flex items-center justify-center gap-2 text-xs font-semibold select-none z-50 shadow-md ${
                !isOnline
                    ? 'bg-rose-950/90 text-rose-200 border-b border-rose-800/80 backdrop-blur-md animate-pulse'
                    : 'bg-emerald-950/90 text-emerald-200 border-b border-emerald-800/80 backdrop-blur-md'
            }`}
        >
            {!isOnline ? (
                <>
                    <WifiOff size={14} className="text-rose-400 shrink-0" />
                    <span>No Internet Connection • Waiting for network…</span>
                    <button
                        onClick={() => window.location.reload()}
                        className="ml-2 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-100 border border-rose-700/50 cursor-pointer transition-colors"
                    >
                        <RefreshCw size={10} /> Retry
                    </button>
                </>
            ) : (
                <>
                    <Wifi size={14} className="text-emerald-400 shrink-0" />
                    <span>Back Online • Connected to chat server</span>
                </>
            )}
        </div>
    );
};
