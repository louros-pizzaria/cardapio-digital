// ===== HOOK PARA SERVICE WORKER =====

import { useEffect, useState } from 'react';

export const useServiceWorker = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      setIsRegistered(true);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }
      });

      console.log('✅ Service Worker registrado');
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  };

  const updateServiceWorker = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    isSupported,
    isRegistered,
    updateAvailable,
    updateServiceWorker
  };
};