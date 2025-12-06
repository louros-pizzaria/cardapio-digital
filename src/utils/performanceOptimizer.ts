// ===== PERFORMANCE OPTIMIZER SYSTEM =====

import { realUserMonitoring } from './realUserMonitoring';

export interface PerformanceConfig {
  enableResourceHints: boolean;
  enableImageOptimization: boolean;
  enableCriticalResourcePriority: boolean;
  enableLazyLoading: boolean;
  enableServiceWorkerCaching: boolean;
  memoryLeakDetection: boolean;
  performanceBudgets: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
    totalBlockingTime: number;
  };
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private config: PerformanceConfig;
  private resourceObserver?: PerformanceObserver;
  private memoryMonitor?: number;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private getDefaultConfig(): PerformanceConfig {
    return {
      enableResourceHints: true,
      enableImageOptimization: true,
      enableCriticalResourcePriority: true,
      enableLazyLoading: true,
      enableServiceWorkerCaching: true,
      memoryLeakDetection: true,
      performanceBudgets: {
        firstContentfulPaint: 2000,
        largestContentfulPaint: 3000,
        firstInputDelay: 100,
        cumulativeLayoutShift: 0.1,
        totalBlockingTime: 200
      }
    };
  }

  private initialize() {
    if (this.config.enableResourceHints) {
      this.setupResourceHints();
    }
    
    if (this.config.enableImageOptimization) {
      this.setupImageOptimization();
    }
    
    if (this.config.enableCriticalResourcePriority) {
      this.setupCriticalResourcePriority();
    }
    
    if (this.config.enableLazyLoading) {
      this.setupLazyLoading();
    }
    
    if (this.config.memoryLeakDetection) {
      this.setupMemoryLeakDetection();
    }

    this.setupPerformanceBudgetMonitoring();
    this.setupResourceLoadOptimization();
    this.setupNetworkOptimization();
  }

  // ===== RESOURCE HINTS =====
  private setupResourceHints() {
    // DNS prefetch for external domains
    const externalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://js.stripe.com',
      'https://api.mercadopago.com',
      'https://xpgsfovrxguphlvncgwn.supabase.co'
    ];

    externalDomains.forEach(domain => {
      this.addResourceHint('dns-prefetch', domain);
    });

    // Preconnect to critical origins
    const criticalOrigins = [
      'https://xpgsfovrxguphlvncgwn.supabase.co',
      'https://fonts.gstatic.com'
    ];

    criticalOrigins.forEach(origin => {
      this.addResourceHint('preconnect', origin, { crossorigin: true });
    });

    // Module preload for critical scripts
    this.preloadCriticalModules();
  }

  private addResourceHint(rel: string, href: string, options: { crossorigin?: boolean } = {}) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    
    if (options.crossorigin) {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }

  private preloadCriticalModules() {
    const criticalModules = [
      '/src/main.tsx',
      '/src/App.tsx',
      '/src/integrations/supabase/client.ts'
    ];

    criticalModules.forEach(module => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = module;
      document.head.appendChild(link);
    });
  }

  // ===== IMAGE OPTIMIZATION =====
  private setupImageOptimization() {
    // Optimize existing images
    this.optimizeExistingImages();
    
    // Setup observer for new images
    this.setupImageObserver();
    
    // Enable WebP support detection
    this.detectWebPSupport();
  }

  private optimizeExistingImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => this.optimizeImage(img));
  }

  private setupImageObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Optimize new images
            if (element.tagName === 'IMG') {
              this.optimizeImage(element as HTMLImageElement);
            }
            
            // Optimize images within added elements
            const images = element.querySelectorAll('img');
            images.forEach(img => this.optimizeImage(img));
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  private optimizeImage(img: HTMLImageElement) {
    // Add loading="lazy" if not present
    if (!img.hasAttribute('loading') && !this.isAboveFold(img)) {
      img.loading = 'lazy';
    }

    // Add decoding="async" for better performance
    if (!img.hasAttribute('decoding')) {
      img.decoding = 'async';
    }

    // Add sizes attribute for responsive images
    if (!img.hasAttribute('sizes') && img.hasAttribute('srcset')) {
      img.sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
    }

    // Monitor image load performance
    img.addEventListener('load', () => {
      const loadTime = performance.now();
      realUserMonitoring.recordMetric({
        session_id: realUserMonitoring.getSessionId(),
        metric_type: 'performance',
        metric_name: 'image_load_time',
        value: loadTime,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        metadata: {
          image_src: img.src,
          image_size: `${img.naturalWidth}x${img.naturalHeight}`,
          is_lazy: img.loading === 'lazy'
        }
      });
    });

    // Handle image errors
    img.addEventListener('error', () => {
      realUserMonitoring.reportError({
        error_type: 'network',
        message: `Failed to load image: ${img.src}`,
        severity: 'low',
        metadata: {
          image_src: img.src,
          image_alt: img.alt
        }
      });
    });
  }

  private isAboveFold(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  private detectWebPSupport() {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      const isSupported = webP.height === 2;
      document.documentElement.classList.toggle('webp', isSupported);
      document.documentElement.classList.toggle('no-webp', !isSupported);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  }

  // ===== CRITICAL RESOURCE PRIORITY =====
  private setupCriticalResourcePriority() {
    // Mark critical resources with high priority
    const criticalResources = document.querySelectorAll('link[rel="stylesheet"], script[src]');
    
    criticalResources.forEach((resource, index) => {
      if (index < 3) { // First 3 resources are critical
        if (resource.tagName === 'LINK') {
          (resource as HTMLLinkElement).fetchPriority = 'high';
        } else if (resource.tagName === 'SCRIPT') {
          (resource as HTMLScriptElement).fetchPriority = 'high';
        }
      }
    });

    // Setup resource priority observer
    this.setupResourcePriorityObserver();
  }

  private setupResourcePriorityObserver() {
    if ('PerformanceObserver' in window) {
      this.resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Check for slow resources
          if (resourceEntry.duration > 2000) {
            console.warn('Slow resource detected:', resourceEntry.name, `${resourceEntry.duration}ms`);
            
            realUserMonitoring.recordMetric({
              session_id: realUserMonitoring.getSessionId(),
              metric_type: 'performance',
              metric_name: 'slow_resource',
              value: resourceEntry.duration,
              unit: 'ms',
              timestamp: new Date().toISOString(),
              page_url: window.location.href,
              user_agent: navigator.userAgent,
              device_type: this.getDeviceType(),
              metadata: {
                resource_name: resourceEntry.name,
                resource_type: resourceEntry.initiatorType,
                transfer_size: resourceEntry.transferSize,
                encoded_body_size: resourceEntry.encodedBodySize
              }
            });
          }
        }
      });

      this.resourceObserver.observe({ entryTypes: ['resource'] });
    }
  }

  // ===== LAZY LOADING =====
  private setupLazyLoading() {
    // Setup Intersection Observer for lazy loading
    const lazyLoadObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          
          // Load lazy images
          if (element.tagName === 'IMG' && element.hasAttribute('data-src')) {
            const img = element as HTMLImageElement;
            img.src = img.dataset.src!;
            img.removeAttribute('data-src');
            lazyLoadObserver.unobserve(img);
          }
          
          // Load lazy components
          if (element.hasAttribute('data-lazy-component')) {
            this.loadLazyComponent(element);
            lazyLoadObserver.unobserve(element);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });

    // Observe existing lazy elements
    document.querySelectorAll('[data-src], [data-lazy-component]').forEach(el => {
      lazyLoadObserver.observe(el);
    });

    // Setup mutation observer for new lazy elements
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            if (element.hasAttribute('data-src') || element.hasAttribute('data-lazy-component')) {
              lazyLoadObserver.observe(element);
            }
            
            const lazyElements = element.querySelectorAll('[data-src], [data-lazy-component]');
            lazyElements.forEach(el => lazyLoadObserver.observe(el));
          }
        });
      });
    });

    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  private loadLazyComponent(element: HTMLElement) {
    const componentName = element.dataset.lazyComponent;
    console.log(`Loading lazy component: ${componentName}`);
    
    // Simulate component loading
    element.innerHTML = '<div>Loading component...</div>';
    
    setTimeout(() => {
      element.innerHTML = `<div>Loaded: ${componentName}</div>`;
    }, 100);
  }

  // ===== MEMORY LEAK DETECTION =====
  private setupMemoryLeakDetection() {
    if ('memory' in performance) {
      this.memoryMonitor = window.setInterval(() => {
        const memory = (performance as any).memory;
        const memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        };

        const usagePercentage = (memoryUsage.used / memoryUsage.limit) * 100;

        realUserMonitoring.recordMetric({
          session_id: realUserMonitoring.getSessionId(),
          metric_type: 'performance',
          metric_name: 'memory_usage',
          value: usagePercentage,
          unit: 'percent',
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          device_type: this.getDeviceType(),
          metadata: memoryUsage
        });

        // Alert on high memory usage
        if (usagePercentage > 80) {
          console.warn('High memory usage detected:', usagePercentage.toFixed(2) + '%');
          realUserMonitoring.reportError({
            error_type: 'performance',
            message: `High memory usage: ${usagePercentage.toFixed(2)}%`,
            severity: 'medium',
            metadata: memoryUsage
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // ===== PERFORMANCE BUDGET MONITORING =====
  private setupPerformanceBudgetMonitoring() {
    if ('PerformanceObserver' in window) {
      const budgetObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.checkPerformanceBudget(entry);
        }
      });

      try {
        budgetObserver.observe({
          entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift']
        });
      } catch (error) {
        console.warn('Performance budget monitoring not fully supported:', error);
      }
    }
  }

  private checkPerformanceBudget(entry: PerformanceEntry) {
    const budgets = this.config.performanceBudgets;
    let budgetViolation = false;
    let violatedMetric = '';
    let actualValue = 0;
    let budgetValue = 0;

    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint' && entry.startTime > budgets.firstContentfulPaint) {
          budgetViolation = true;
          violatedMetric = 'First Contentful Paint';
          actualValue = entry.startTime;
          budgetValue = budgets.firstContentfulPaint;
        }
        break;

      case 'largest-contentful-paint':
        if (entry.startTime > budgets.largestContentfulPaint) {
          budgetViolation = true;
          violatedMetric = 'Largest Contentful Paint';
          actualValue = entry.startTime;
          budgetValue = budgets.largestContentfulPaint;
        }
        break;

      case 'first-input':
        const fidEntry = entry as PerformanceEventTiming;
        const inputDelay = fidEntry.processingStart - fidEntry.startTime;
        if (inputDelay > budgets.firstInputDelay) {
          budgetViolation = true;
          violatedMetric = 'First Input Delay';
          actualValue = inputDelay;
          budgetValue = budgets.firstInputDelay;
        }
        break;

      case 'layout-shift':
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput && clsEntry.value > budgets.cumulativeLayoutShift) {
          budgetViolation = true;
          violatedMetric = 'Cumulative Layout Shift';
          actualValue = clsEntry.value;
          budgetValue = budgets.cumulativeLayoutShift;
        }
        break;
    }

    if (budgetViolation) {
      console.warn(`Performance budget exceeded: ${violatedMetric}`, {
        actual: actualValue,
        budget: budgetValue,
        overage: actualValue - budgetValue
      });

      realUserMonitoring.reportError({
        error_type: 'performance',
        message: `Performance budget exceeded: ${violatedMetric}`,
        severity: 'medium',
        metadata: {
          metric: violatedMetric,
          actual_value: actualValue,
          budget_value: budgetValue,
          overage: actualValue - budgetValue
        }
      });
    }
  }

  // ===== RESOURCE LOAD OPTIMIZATION =====
  private setupResourceLoadOptimization() {
    // Optimize font loading
    this.optimizeFontLoading();
    
    // Setup prefetch for likely navigation
    this.setupPrefetchOptimization();
    
    // Optimize third-party scripts
    this.optimizeThirdPartyScripts();
  }

  private optimizeFontLoading() {
    // Add font-display: swap to font face rules
    try {
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
    } catch (error) {
      console.warn('Cannot optimize font loading:', error);
    }
  }

  private setupPrefetchOptimization() {
    // Prefetch likely next pages based on user behavior
    const commonRoutes = ['/menu', '/cart', '/account', '/orders'];
    
    commonRoutes.forEach(route => {
      if (route !== window.location.pathname) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      }
    });

    // Prefetch on hover for navigation links
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'A' && target.hasAttribute('href')) {
        const href = target.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          this.prefetchPage(href);
        }
      }
    });
  }

  private prefetchPage(href: string) {
    const existingPrefetch = document.querySelector(`link[rel="prefetch"][href="${href}"]`);
    if (!existingPrefetch) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  private optimizeThirdPartyScripts() {
    // Defer non-critical third-party scripts
    const thirdPartyScripts = document.querySelectorAll('script[src*="//"]');
    
    thirdPartyScripts.forEach(script => {
      const scriptElement = script as HTMLScriptElement;
      if (!scriptElement.async && !scriptElement.defer) {
        scriptElement.defer = true;
      }
    });
  }

  // ===== NETWORK OPTIMIZATION =====
  private setupNetworkOptimization() {
    // Monitor network conditions
    this.monitorNetworkConditions();
    
    // Implement adaptive loading
    this.setupAdaptiveLoading();
  }

  private monitorNetworkConditions() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const networkInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };

      realUserMonitoring.recordMetric({
        session_id: realUserMonitoring.getSessionId(),
        metric_type: 'performance',
        metric_name: 'network_conditions',
        value: connection.downlink,
        unit: 'mbps',
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        metadata: networkInfo
      });

      // Adjust resource loading based on network conditions
      if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.enableDataSaverMode();
      }
    }
  }

  private setupAdaptiveLoading() {
    // Implement adaptive loading strategies based on device capabilities
    const deviceMemory = (navigator as any).deviceMemory || 4; // Default to 4GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    if (deviceMemory < 2 || hardwareConcurrency < 4) {
      this.enableLowEndDeviceMode();
    }
  }

  private enableDataSaverMode() {
    console.log('Data saver mode enabled');
    document.documentElement.classList.add('data-saver-mode');
    
    // Reduce image quality
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.dataset.lowQualitySrc) {
        img.src = img.dataset.lowQualitySrc;
      }
    });
  }

  private enableLowEndDeviceMode() {
    console.log('Low-end device mode enabled');
    document.documentElement.classList.add('low-end-device');
    
    // Reduce animations
    const style = document.createElement('style');
    style.textContent = `
      .low-end-device * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ===== UTILITY METHODS =====
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // ===== PUBLIC METHODS =====
  public updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  public optimizeElement(element: HTMLElement) {
    if (element.tagName === 'IMG') {
      this.optimizeImage(element as HTMLImageElement);
    }
  }

  public preloadResource(url: string, type: 'script' | 'style' | 'image' | 'fetch' = 'fetch') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    document.head.appendChild(link);
  }

  public debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  }

  public getOptimizationReport() {
    return {
      strategies: [
        {
          name: 'Image Optimization',
          enabled: this.config.enableImageOptimization,
          impact: 'High',
          description: 'Lazy loading and image compression'
        },
        {
          name: 'Resource Hints',
          enabled: this.config.enableResourceHints,
          impact: 'Medium',
          description: 'DNS prefetch and preconnect optimizations'
        },
        {
          name: 'Memory Monitoring',
          enabled: this.config.memoryLeakDetection,
          impact: 'Low',
          description: 'Memory usage tracking and alerts'
        }
      ],
      metrics: {
        optimizedImages: 0,
        prefetchedResources: 0,
        memoryUsage: 0
      }
    };
  }

  public enableStrategy(strategyName: string) {
    switch (strategyName) {
      case 'Image Optimization':
        this.config.enableImageOptimization = true;
        break;
      case 'Resource Hints':
        this.config.enableResourceHints = true;
        break;
      case 'Memory Monitoring':
        this.config.memoryLeakDetection = true;
        break;
    }
  }

  public disableStrategy(strategyName: string) {
    switch (strategyName) {
      case 'Image Optimization':
        this.config.enableImageOptimization = false;
        break;
      case 'Resource Hints':
        this.config.enableResourceHints = false;
        break;
      case 'Memory Monitoring':
        this.config.memoryLeakDetection = false;
        break;
    }
  }

  public cleanup() {
    if (this.resourceObserver) {
      this.resourceObserver.disconnect();
    }
    
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Export convenience functions
export const optimizeElement = (element: HTMLElement) => performanceOptimizer.optimizeElement(element);
export const preloadResource = (url: string, type?: 'script' | 'style' | 'image' | 'fetch') => performanceOptimizer.preloadResource(url, type);
export const updatePerformanceConfig = (config: Partial<PerformanceConfig>) => performanceOptimizer.updateConfig(config);