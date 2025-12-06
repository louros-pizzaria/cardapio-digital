// ===== COMPONENTE PWA INSTALL PROMPT =====

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Smartphone, Download, Share, Bell } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useTrackEvent } from '@/hooks/useAnalytics';

export const PWAInstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isInstallable, isInstalled, installApp, shareApp, requestNotificationPermission } = usePWA();
  const track = useTrackEvent();

  useEffect(() => {
    // Mostrar prompt após 30 segundos se for possível instalar
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        track('pwa', 'prompt_shown', 'install');
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed, track]);

  useEffect(() => {
    // Verificar se foi dismissado anteriormente
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      track('pwa', 'install_success', 'user_action');
      setIsVisible(false);
    } else {
      track('pwa', 'install_failed', 'user_action');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', 'true');
    track('pwa', 'prompt_dismissed', 'user_action');
  };

  const handleShare = async () => {
    const success = await shareApp();
    if (success) {
      track('pwa', 'app_shared', 'user_action');
    }
  };

  const handleNotifications = async () => {
    const success = await requestNotificationPermission();
    if (success) {
      track('pwa', 'notifications_enabled', 'user_action');
    }
  };

  if (!isVisible || !isInstallable || isInstalled) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md glass shadow-hard">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full hover-lift"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 gradient-primary rounded-full">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Instalar Pizza Express</CardTitle>
              <CardDescription>
                Acesso rápido e experiência otimizada
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Funciona offline</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Notificações de pedidos</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Acesso direto do menu inicial</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleInstall}
              className="w-full gradient-primary hover-lift"
            >
              <Download className="h-4 w-4 mr-2" />
              Instalar
            </Button>
            
            <Button
              variant="outline"
              onClick={handleShare}
              className="w-full hover-lift"
            >
              <Share className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={handleNotifications}
            className="w-full hover-lift"
          >
            <Bell className="h-4 w-4 mr-2" />
            Ativar notificações
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Você pode desinstalar a qualquer momento
          </p>
        </CardContent>
      </Card>
    </div>
  );
};