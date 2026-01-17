'use client';

import { useEffect, useState } from 'react';

export function OfflineDetector() {
    const [isOnline, setIsOnline] = useState(true);
    const [showMessage, setShowMessage] = useState(false);

    useEffect(() => {
        // Initial check
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowMessage(true);
            // Auto-hide "back online" message after 3 seconds
            setTimeout(() => setShowMessage(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowMessage(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Don't show anything if online and message already dismissed
    if (isOnline && !showMessage) return null;

    return (
        <div
            className={`fixed top-0 left-0 right-0 px-4 py-3 text-center z-50 transition-all duration-300 ${isOnline
                    ? 'bg-green-600 text-white'
                    : 'bg-yellow-600 text-white'
                }`}
            role="alert"
        >
            <div className="flex items-center justify-center gap-2">
                {isOnline ? (
                    <>
                        <span className="text-xl">✅</span>
                        <span className="font-semibold">Back Online!</span>
                        <span className="text-sm opacity-90">All features available</span>
                    </>
                ) : (
                    <>
                        <span className="text-xl">⚠️</span>
                        <span className="font-semibold">You are offline</span>
                        <span className="text-sm opacity-90 hidden sm:inline">
                            • Games will work • Reports require internet
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
