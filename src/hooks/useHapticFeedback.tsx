import { useCallback, useEffect } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' | 'impact';

interface HapticSettings {
  enabled: boolean;
  intensity: number; // 0-1
  patterns: Record<HapticPattern, number[]>;
}

export const useHapticFeedback = () => {
  const defaultSettings: HapticSettings = {
    enabled: true,
    intensity: 0.7,
    patterns: {
      light: [10],
      medium: [20],
      heavy: [40],
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [50, 100, 50, 100, 50],
      selection: [5],
      impact: [30]
    }
  };

  // Check if device supports haptic feedback
  const isSupported = useCallback(() => {
    return 'vibrate' in navigator || 'webkitVibrate' in navigator;
  }, []);

  // Get saved settings from localStorage
  const getSettings = useCallback((): HapticSettings => {
    try {
      const saved = localStorage.getItem('haptic_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((settings: Partial<HapticSettings>) => {
    try {
      const current = getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem('haptic_settings', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving haptic settings:', error);
    }
  }, [getSettings]);

  // Trigger haptic feedback
  const haptic = useCallback((pattern: HapticPattern | number[] = 'light') => {
    if (!isSupported()) return;

    const settings = getSettings();
    if (!settings.enabled) return;

    let vibrationPattern: number[];

    if (Array.isArray(pattern)) {
      vibrationPattern = pattern;
    } else {
      vibrationPattern = settings.patterns[pattern] || settings.patterns.light;
    }

    // Apply intensity scaling
    const scaledPattern = vibrationPattern.map(duration => 
      Math.round(duration * settings.intensity)
    );

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(scaledPattern);
      } else if ('webkitVibrate' in navigator) {
        (navigator as any).webkitVibrate(scaledPattern);
      }
    } catch (error) {
      console.error('Error triggering haptic feedback:', error);
    }
  }, [isSupported, getSettings]);

  // Predefined haptic functions
  const haptics = {
    light: () => haptic('light'),
    medium: () => haptic('medium'),
    heavy: () => haptic('heavy'),
    success: () => haptic('success'),
    warning: () => haptic('warning'),
    error: () => haptic('error'),
    selection: () => haptic('selection'),
    impact: () => haptic('impact'),
    
    // Custom patterns for specific actions
    buttonTap: () => haptic([5]),
    menuOpen: () => haptic([10, 30]),
    menuClose: () => haptic([30, 10]),
    itemAdded: () => haptic([10, 50, 10]),
    itemRemoved: () => haptic([50, 10]),
    orderConfirmed: () => haptic([20, 100, 20, 100, 20]),
    paymentSuccess: () => haptic([10, 50, 10, 50, 10, 200]),
    paymentError: () => haptic([100, 50, 100, 50, 100]),
    notification: () => haptic([15, 100, 15]),
    swipeAction: () => haptic([8]),
    longPress: () => haptic([50]),
    refresh: () => haptic([20, 100]),
    navigation: () => haptic([5, 20]),
    
    // Voice interaction patterns
    voiceStart: () => haptic([10, 20, 10]),
    voiceEnd: () => haptic([20, 10, 20]),
    voiceError: () => haptic([50, 50, 50]),
    
    // Camera patterns
    cameraCaptured: () => haptic([30]),
    focusLocked: () => haptic([10, 10]),
    
    // Group order patterns
    userJoined: () => haptic([15, 80, 15]),
    userLeft: () => haptic([80, 15, 80]),
    orderUpdated: () => haptic([5, 30, 5])
  };

  // Auto-trigger haptics for common UI interactions
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Button clicks
      if (target.tagName === 'BUTTON' || target.role === 'button') {
        haptics.buttonTap();
      }
      // Link clicks
      else if (target.tagName === 'A') {
        haptics.navigation();
      }
      // Checkbox/radio changes
      else if ((target as HTMLInputElement).type === 'checkbox' || (target as HTMLInputElement).type === 'radio') {
        haptics.selection();
      }
    };

    const handleContextMenu = () => {
      haptics.longPress();
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        haptics.selection();
      }
    };

    if (getSettings().enabled) {
      document.addEventListener('click', handleClick);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('focus', handleFocus, true);

      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('focus', handleFocus, true);
      };
    }
  }, [getSettings, haptics]);

  return {
    isSupported: isSupported(),
    haptic,
    haptics,
    settings: getSettings(),
    updateSettings: saveSettings
  };
};