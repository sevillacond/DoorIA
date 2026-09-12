import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, HardDrive } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (isOnline && !wasOffline) return null;

  if (isOnline && wasOffline) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-xl bg-emerald-950/95 border border-emerald-800 px-4 py-2.5 text-xs font-semibold text-emerald-200 shadow-2xl backdrop-blur-md animate-fadeIn">
        <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Conexão restabelecida. Sincronizado com a rede local.</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-xl bg-amber-950/95 border border-amber-800 px-4 py-2.5 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur-md animate-fadeIn">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
      <div className="flex-1">
        <div className="font-bold text-white flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          <span>Modo Local-First Ativo</span>
        </div>
        <div className="text-[11px] text-amber-300/80 font-normal">
          Sem conexão externa. Operando com dados e cache locais da guarita.
        </div>
      </div>
    </div>
  );
};
