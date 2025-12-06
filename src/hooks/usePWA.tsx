// ===== PWA HOOKS AVANÇADO =====

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  installPrompt: any;
}

export const usePWA = () => {
  const { toast } = useToast();
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
    installPrompt: null,
  });

  useEffect(() => {
    // Detectar se é PWA instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setState(prev => ({ ...prev, isInstalled: isStandalone }));

    // Listener para prompt de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e,
      }));
    };

    // Listener para online/offline
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast({
        title: "🌐 Conexão restaurada",
        description: "Você está online novamente!",
      });
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast({
        title: "📵 Modo offline",
        description: "Continuando com dados salvos localmente",
        variant: "destructive",
      });
    };

    // Listener para atualizações do Service Worker
    const handleServiceWorkerUpdate = () => {
      setState(prev => ({ ...prev, hasUpdate: true }));
        toast({
          title: "🔄 Atualização disponível",
          description: "Nova versão do app está pronta!",
        });
    };

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Service Worker listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
          handleServiceWorkerUpdate();
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const installApp = async () => {
    if (!state.installPrompt) return false;

    try {
      const result = await state.installPrompt.prompt();
      const { outcome } = await result.userChoice;

      if (outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          isInstalled: true,
          installPrompt: null,
        }));
        
        toast({
          title: "🚀 App instalado!",
          description: "Pizza Express agora está no seu dispositivo",
        });
        
        return true;
      }
    } catch (error) {
      console.error('Erro na instalação:', error);
    }

    return false;
  };

  const shareApp = async () => {
    const shareData = {
      title: 'Pizza Express',
      text: 'Peça sua pizza favorita pelo app!',
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return true;
      } else {
        // Fallback para clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "📋 Link copiado!",
          description: "Compartilhe com seus amigos",
        });
        return true;
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        toast({
          title: "🔔 Notificações ativadas",
          description: "Você receberá updates sobre seus pedidos",
        });
        return true;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    }

    return false;
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
    return null;
  };

  return {
    ...state,
    installApp,
    shareApp,
    requestNotificationPermission,
    sendNotification,
  };
};