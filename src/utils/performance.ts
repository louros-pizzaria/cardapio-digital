// ===== UTILITÁRIOS DE PERFORMANCE =====

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Lazy load de imagens com Intersection Observer
export const lazyLoadImage = (img: HTMLImageElement, src: string) => {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const image = entry.target as HTMLImageElement;
        image.src = src;
        image.classList.remove('lazy');
        imageObserver.unobserve(image);
      }
    });
  });

  imageObserver.observe(img);
};

// Medição de performance
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start} milliseconds`);
};

// Bundle splitting dinâmico
export const dynamicImport = async (path: string) => {
  try {
    const module = await import(path);
    return module.default || module;
  } catch (error) {
    console.error(`Error loading module ${path}:`, error);
    throw error;
  }
};

// Cache em memória simples
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, data: any, ttl: number = 300000) { // 5 min default
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

export const memoryCache = new MemoryCache();