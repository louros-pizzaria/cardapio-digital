// ===== ANALYTICS & PERFORMANCE MONITORING =====

import { useState, useEffect, useCallback } from 'react';
import { memoryCache } from '@/utils/performance';

interface AnalyticsEvent {
  event: string;
  category: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface PerformanceMetrics {
  pageLoad: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  memoryUsage: number;
  connectionType: string;
}

interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
  isActive: boolean;
}

export const useAnalytics = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [abTests, setAbTests] = useState<Record<string, ABTestVariant>>({});

  // ===== TRACKING DE EVENTOS =====
  const track = useCallback((
    event: string, 
    category: string, 
    label?: string, 
    value?: number,
    metadata?: Record<string, any>
  ) => {
    const eventData: AnalyticsEvent = {
      event,
      category,
      label,
      value,
      metadata: {
        ...metadata,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    setEvents(prev => [...prev.slice(-99), eventData]); // Manter apenas 100 eventos

    // Cache local para análise
    memoryCache.set(`analytics_${Date.now()}`, eventData, 86400000); // 24h

    // Log para debug (remover em produção)
    console.log('📊 Analytics Event:', eventData);
  }, []);

  // ===== MÉTRICAS DE PERFORMANCE =====
  const measurePerformance = useCallback(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          const newMetrics: PerformanceMetrics = {
            pageLoad: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            firstInputDelay: 0,
            cumulativeLayoutShift: 0,
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
            connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          };
          
          setMetrics(newMetrics);
          
          track('performance', 'page_load', 'navigation', navEntry.loadEventEnd - navEntry.loadEventStart, {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            connectionType: newMetrics.connectionType,
          });
        }

        if (entry.entryType === 'largest-contentful-paint') {
          setMetrics(prev => prev ? { ...prev, largestContentfulPaint: entry.startTime } : null);
          track('performance', 'lcp', 'timing', entry.startTime);
        }

        if (entry.entryType === 'first-input') {
          const fidEntry = entry as PerformanceEventTiming;
          setMetrics(prev => prev ? { ...prev, firstInputDelay: fidEntry.processingStart - fidEntry.startTime } : null);
          track('performance', 'fid', 'timing', fidEntry.processingStart - fidEntry.startTime);
        }

        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          setMetrics(prev => {
            const currentCLS = prev?.cumulativeLayoutShift || 0;
            return prev ? { ...prev, cumulativeLayoutShift: currentCLS + (entry as any).value } : null;
          });
        }
      });
    });

    observer.observe({ 
      entryTypes: ['navigation', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
    });

    return () => observer.disconnect();
  }, [track]);

  // ===== A/B TESTING =====
  const createABTest = useCallback((testId: string, variants: Omit<ABTestVariant, 'isActive'>[]) => {
    // Algoritmo de distribuição baseado em hash do user
    const userId = localStorage.getItem('user_id') || 'anonymous';
    const hash = hashCode(userId + testId);
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const randomValue = Math.abs(hash) % totalWeight;
    
    let currentWeight = 0;
    const selectedVariant = variants.find(variant => {
      currentWeight += variant.weight;
      return randomValue < currentWeight;
    }) || variants[0];

    const testVariants = variants.reduce((acc, variant) => {
      acc[variant.id] = {
        ...variant,
        isActive: variant.id === selectedVariant.id,
      };
      return acc;
    }, {} as Record<string, ABTestVariant>);

    setAbTests(prev => ({ ...prev, [testId]: testVariants[selectedVariant.id] }));
    
    track('ab_test', 'variant_assigned', testId, undefined, {
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
    });

    return selectedVariant.id;
  }, [track]);

  const getABTestVariant = useCallback((testId: string) => {
    return abTests[testId];
  }, [abTests]);

  // ===== TRACKING AUTOMÁTICO =====
  useEffect(() => {
    // Página visitada
    track('page', 'view', window.location.pathname);

    // Tempo na página
    const startTime = Date.now();
    const handleBeforeUnload = () => {
      const timeSpent = Date.now() - startTime;
      track('engagement', 'time_on_page', window.location.pathname, timeSpent);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Métricas de performance
    const cleanupPerformance = measurePerformance();

    // Erros JavaScript
    const handleError = (event: ErrorEvent) => {
      track('error', 'javascript', event.message, undefined, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('error', handleError);
      cleanupPerformance?.();
    };
  }, [track, measurePerformance]);

  // ===== UTILS =====
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  };

  const exportAnalytics = useCallback(() => {
    const data = {
      events: events.slice(-100), // Últimos 100 eventos
      metrics,
      abTests,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [events, metrics, abTests]);

  const getRealTimeStats = useCallback(() => {
    return {
      totalEvents: events.length,
      eventsLast5min: events.filter(e => Date.now() - e.timestamp < 300000).length,
      topCategories: events.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      performance: metrics,
      activeABTests: Object.keys(abTests).length,
    };
  }, [events, metrics, abTests]);

  return {
    // Tracking
    track,
    
    // Performance
    metrics,
    measurePerformance,
    
    // A/B Testing
    createABTest,
    getABTestVariant,
    
    // Analytics
    events: events.slice(-50), // Últimos 50 para UI
    exportAnalytics,
    getRealTimeStats,
    
    // Utils
    abTests,
  };
};

// ===== HOOK SIMPLIFICADO PARA COMPONENTES =====
export const useTrackEvent = () => {
  const { track } = useAnalytics();
  return track;
};

// ===== HOOK PARA A/B TESTING =====
export const useABTest = (testId: string, variants: Omit<ABTestVariant, 'isActive'>[]) => {
  const { createABTest, getABTestVariant } = useAnalytics();
  
  useEffect(() => {
    if (!getABTestVariant(testId)) {
      createABTest(testId, variants);
    }
  }, [testId, variants, createABTest, getABTestVariant]);

  return getABTestVariant(testId);
};