// ===== HOOK DE SOM CONFIGURÁVEL =====

import { useState, useEffect, useCallback, useRef } from 'react';
import { SoundSettings, DEFAULT_SOUND_SETTINGS, SoundType, PaymentSoundType } from '@/types/soundSettings';
import { toast } from 'sonner';

const STORAGE_KEY = 'attendant-sound-settings';

// Map de sons disponíveis
const SOUND_FILES: Record<SoundType | PaymentSoundType, string> = {
  bell: '/bell.mp3',
  chime: '/sounds/chime.mp3',
  notification: '/sounds/notification.mp3',
  success: '/sounds/success.mp3',
  coin: '/sounds/coin.mp3',
  ding: '/sounds/ding.mp3',
};

export const useSound = () => {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Carregar configurações do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SOUND_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('[SOUND] Erro ao carregar configurações:', error);
    }
  }, []);

  // Salvar configurações no localStorage
  const saveSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('[SOUND] Erro ao salvar configurações:', error);
      }
      return updated;
    });
  }, []);

  // Pré-carregar arquivo de áudio
  const preloadAudio = useCallback((soundFile: string): HTMLAudioElement => {
    if (audioCache.current.has(soundFile)) {
      return audioCache.current.get(soundFile)!;
    }

    const audio = new Audio(soundFile);
    audio.preload = 'auto';
    audioCache.current.set(soundFile, audio);
    return audio;
  }, []);

  // Tocar som com configurações
  const playSound = useCallback(async (
    soundFile: string,
    repeat: number = settings.repeatCount,
    interval: number = settings.intervalBetweenRepeats
  ) => {
    if (!settings.enabled) {
      console.log('[SOUND] Som desabilitado');
      return;
    }

    try {
      const audio = preloadAudio(soundFile);
      audio.volume = settings.volume / 100;

      for (let i = 0; i < repeat; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        // Clonar o áudio para permitir múltiplas reproduções simultâneas
        const audioClone = audio.cloneNode() as HTMLAudioElement;
        audioClone.volume = settings.volume / 100;
        
        try {
          await audioClone.play();
        } catch (playError) {
          console.warn(`[SOUND] Erro ao tocar som (tentativa ${i + 1}):`, playError);
          if (i === 0) {
            // Se primeira tentativa falhar, não tentar repetições
            throw playError;
          }
        }
      }
    } catch (error) {
      console.error('[SOUND] Erro ao reproduzir som:', error);
      // Não mostrar toast para não poluir a interface
    }
  }, [settings, preloadAudio]);

  // Tocar som de novo pedido
  const playNewOrderSound = useCallback(() => {
    const soundFile = SOUND_FILES[settings.newOrderSound];
    return playSound(soundFile);
  }, [settings.newOrderSound, playSound]);

  // Tocar som de pagamento confirmado
  const playPaymentConfirmedSound = useCallback(() => {
    const soundFile = SOUND_FILES[settings.paymentConfirmedSound];
    return playSound(soundFile, 1); // Toca apenas 1 vez
  }, [settings.paymentConfirmedSound, playSound]);

  // Testar som
  const testSound = useCallback(async (type: 'newOrder' | 'payment') => {
    try {
      if (type === 'newOrder') {
        await playNewOrderSound();
        toast.success('Som de novo pedido reproduzido!');
      } else {
        await playPaymentConfirmedSound();
        toast.success('Som de pagamento reproduzido!');
      }
    } catch (error) {
      toast.error('Erro ao reproduzir som', {
        description: 'Verifique as permissões do navegador'
      });
    }
  }, [playNewOrderSound, playPaymentConfirmedSound]);

  // Atualizar configurações
  const updateSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    saveSettings(newSettings);
    toast.success('Configurações de som atualizadas!');
  }, [saveSettings]);

  // Toggle rápido on/off
  const toggleSound = useCallback(() => {
    const newEnabled = !settings.enabled;
    saveSettings({ enabled: newEnabled });
    toast.success(newEnabled ? 'Som ativado' : 'Som desativado');
  }, [settings.enabled, saveSettings]);

  return {
    settings,
    playNewOrderSound,
    playPaymentConfirmedSound,
    testSound,
    updateSettings,
    toggleSound,
  };
};
