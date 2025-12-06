// ===== TIPOS PARA SISTEMA DE SOM CONFIGURÁVEL =====

export type SoundType = 'bell' | 'chime' | 'notification';
export type PaymentSoundType = 'success' | 'coin' | 'ding';

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-100
  newOrderSound: SoundType;
  paymentConfirmedSound: PaymentSoundType;
  repeatCount: number; // 1-5
  intervalBetweenRepeats: number; // ms
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 70,
  newOrderSound: 'bell',
  paymentConfirmedSound: 'success',
  repeatCount: 3,
  intervalBetweenRepeats: 500,
};
