// ===== LAZY IMPORT UTILITIES =====
// Helper para dynamic imports com melhor controle de chunks

import { lazy, ComponentType } from 'react';

/**
 * Wrapper para lazy imports com nomes de chunk customizados
 * Melhora debugging no DevTools e controle de cache
 */
export const lazyWithChunkName = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  chunkName: string
): React.LazyExoticComponent<T> => {
  return lazy(importFn);
};

/**
 * Preload manual de componente lazy
 * Útil para preload hover ou idle time
 */
export const preloadComponent = (
  importFn: () => Promise<any>
): Promise<any> => {
  return importFn();
};

/**
 * Lazy import com retry em caso de falha
 * Útil para network instável
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptImport = (attemptsLeft: number) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (attemptsLeft === 0) {
              reject(error);
              return;
            }
            console.warn(`Retry lazy import (${attemptsLeft} attempts left)`);
            setTimeout(() => attemptImport(attemptsLeft - 1), 1000);
          });
      };
      attemptImport(retries);
    });
  });
};

/**
 * Cache de imports para evitar re-fetching
 */
const importCache = new Map<string, Promise<any>>();

export const cachedLazyImport = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  cacheKey: string
): React.LazyExoticComponent<T> => {
  return lazy(() => {
    if (importCache.has(cacheKey)) {
      return importCache.get(cacheKey)!;
    }
    const importPromise = importFn();
    importCache.set(cacheKey, importPromise);
    return importPromise;
  });
};
