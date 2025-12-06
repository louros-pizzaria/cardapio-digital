// ===== REAL USER MONITORING (RUM) SYSTEM =====

import { supabase } from '@/integrations/supabase/client';

export interface RUMMetric {
  id: string;
  session_id: string;
  user_id?: string;
  metric_type: 'performance' | 'error' | 'interaction' | 'business';
  metric_name: string;
  value: number;
  unit: string;
  metadata: Record<string, any>;
  timestamp: string;
  page_url: string;
  user_agent: string;
  connection_type?: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
}

export interface ErrorReport {
  id: string;
  session_id: string;
  user_id?: string;
  error_type: 'javascript' | 'network' | 'performance' | 'security';
  message: string;
  stack_trace?: string;
  source_file?: string;
  line_number?: number;
  column_number?: number;
  metadata: Record<string, any>;
  timestamp: string;
  page_url: string;
  user_agent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class RealUserMonitoring {
  private static instance: RealUserMonitoring;
  private sessionId: string;
  private performanceObserver?: PerformanceObserver;
  private errorReports: ErrorReport[] = [];
  private metrics: RUMMetric[] = [];
  private isEnabled: boolean = true;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  public static getInstance(): RealUserMonitoring {
    if (!RealUserMonitoring.instance) {
      RealUserMonitoring.instance = new RealUserMonitoring();
    }
    return RealUserMonitoring.instance;
  }

  // ===== INICIALIZAÇÃO =====
  private initializeMonitoring() {
    this.setupPerformanceObserver();
    this.setupErrorTracking();
    this.setupNetworkMonitoring();
    this.setupUserInteractionTracking();
    this.setupBusinessMetrics();
    this.startBatchReporting();
  }

  // ===== PERFORMANCE OBSERVER =====
  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackPerformanceEntry(entry);
        }
      });

      try {
        this.performanceObserver.observe({
          entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift', 'resource']
        });
      } catch (error) {
        console.warn('Some performance metrics not supported:', error);
      }
    }
  }

  private trackPerformanceEntry(entry: PerformanceEntry) {
    const baseMetric = {
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      device_type: this.getDeviceType(),
      metric_type: 'performance' as const
    };

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.recordMetric({
          ...baseMetric,
          metric_name: 'page_load_time',
          value: navEntry.loadEventEnd - navEntry.fetchStart,
          unit: 'ms',
          metadata: {
            dom_complete: navEntry.domComplete - navEntry.fetchStart,
            dom_interactive: navEntry.domInteractive - navEntry.fetchStart,
            first_byte: navEntry.responseStart - navEntry.fetchStart
          }
        });
        break;

      case 'paint':
        this.recordMetric({
          ...baseMetric,
          metric_name: entry.name.replace('-', '_'),
          value: entry.startTime,
          unit: 'ms',
          metadata: { entry_type: entry.entryType }
        });
        break;

      case 'largest-contentful-paint':
        this.recordMetric({
          ...baseMetric,
          metric_name: 'largest_contentful_paint',
          value: entry.startTime,
          unit: 'ms',
          metadata: { entry_type: entry.entryType }
        });
        break;

      case 'first-input':
        const fidEntry = entry as PerformanceEventTiming;
        this.recordMetric({
          ...baseMetric,
          metric_name: 'first_input_delay',
          value: fidEntry.processingStart - fidEntry.startTime,
          unit: 'ms',
          metadata: { entry_type: entry.entryType }
        });
        break;

      case 'layout-shift':
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          this.recordMetric({
            ...baseMetric,
            metric_name: 'cumulative_layout_shift',
            value: clsEntry.value,
            unit: 'score',
            metadata: { entry_type: entry.entryType }
          });
        }
        break;

      case 'resource':
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.duration > 1000) { // Only track slow resources
          this.recordMetric({
            ...baseMetric,
            metric_name: 'slow_resource',
            value: resourceEntry.duration,
            unit: 'ms',
            metadata: {
              resource_name: resourceEntry.name,
              resource_type: resourceEntry.initiatorType,
              transfer_size: resourceEntry.transferSize
            }
          });
        }
        break;
    }
  }

  // ===== ERROR TRACKING =====
  private setupErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        error_type: 'javascript',
        message: event.message,
        stack_trace: event.error?.stack,
        source_file: event.filename,
        line_number: event.lineno,
        column_number: event.colno,
        severity: 'high',
        metadata: { event_type: 'error' }
      });
    });

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        error_type: 'javascript',
        message: `Unhandled promise rejection: ${event.reason}`,
        stack_trace: event.reason?.stack,
        severity: 'medium',
        metadata: { event_type: 'unhandledrejection' }
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.reportError({
          error_type: 'network',
          message: `Failed to load resource: ${(event.target as any)?.src || (event.target as any)?.href}`,
          severity: 'low',
          metadata: { 
            event_type: 'resource_error',
            element_type: (event.target as any)?.tagName
          }
        });
      }
    }, true);
  }

  // ===== NETWORK MONITORING =====
  private setupNetworkMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0]?.toString() || 'unknown';
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.recordMetric({
          session_id: this.sessionId,
          metric_type: 'performance',
          metric_name: 'api_response_time',
          value: duration,
          unit: 'ms',
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          device_type: this.getDeviceType(),
          metadata: {
            url: url,
            status: response.status,
            method: args[1]?.method || 'GET'
          }
        });

        if (!response.ok) {
          this.reportError({
            error_type: 'network',
            message: `HTTP ${response.status}: ${url}`,
            severity: response.status >= 500 ? 'high' : 'medium',
            metadata: {
              url,
              status: response.status,
              method: args[1]?.method || 'GET'
            }
          });
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.reportError({
          error_type: 'network',
          message: `Network request failed: ${url}`,
          stack_trace: error instanceof Error ? error.stack : undefined,
          severity: 'high',
          metadata: {
            url,
            duration,
            method: args[1]?.method || 'GET'
          }
        });

        throw error;
      }
    };
  }

  // ===== USER INTERACTION TRACKING =====
  private setupUserInteractionTracking() {
    // Track click events
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const elementInfo = this.getElementInfo(target);
      
      this.recordMetric({
        session_id: this.sessionId,
        metric_type: 'interaction',
        metric_name: 'click',
        value: 1,
        unit: 'count',
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        metadata: elementInfo
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      
      this.recordMetric({
        session_id: this.sessionId,
        metric_type: 'interaction',
        metric_name: 'form_submit',
        value: 1,
        unit: 'count',
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        metadata: {
          form_id: form.id,
          form_name: form.name,
          action: form.action
        }
      });
    });
  }

  // ===== BUSINESS METRICS =====
  private setupBusinessMetrics() {
    // Track page views
    const trackPageView = () => {
      this.recordMetric({
        session_id: this.sessionId,
        metric_type: 'business',
        metric_name: 'page_view',
        value: 1,
        unit: 'count',
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        metadata: {
          referrer: document.referrer,
          title: document.title
        }
      });
    };

    // Initial page view
    trackPageView();

    // Track navigation changes (SPA)
    window.addEventListener('popstate', trackPageView);
    
    // Track time on page
    let pageStartTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - pageStartTime;
      this.recordMetric({
        session_id: this.sessionId,
        metric_type: 'business',
        metric_name: 'time_on_page',
        value: timeOnPage,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        metadata: {
          page_title: document.title
        }
      });
    });
  }

  // ===== UTILITY METHODS =====
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getElementInfo(element: HTMLElement) {
    return {
      tag_name: element.tagName.toLowerCase(),
      id: element.id,
      class_name: element.className,
      text_content: element.textContent?.slice(0, 100),
      data_attributes: Object.fromEntries(
        Array.from(element.attributes)
          .filter(attr => attr.name.startsWith('data-'))
          .map(attr => [attr.name, attr.value])
      )
    };
  }

  // ===== PUBLIC METHODS =====
  public recordMetric(metric: Omit<RUMMetric, 'id'>) {
    // Don't generate ID here - let database generate UUID automatically
    const fullMetric = metric as RUMMetric;
    this.metrics.push(fullMetric);
  }

  public reportError(error: Omit<ErrorReport, 'id' | 'session_id' | 'timestamp' | 'page_url' | 'user_agent'>) {
    // Don't generate ID here - let database generate UUID automatically
    const fullError = {
      ...error,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      user_agent: navigator.userAgent
    } as ErrorReport;

    this.errorReports.push(fullError);
    
    // Log critical errors immediately
    if (error.severity === 'critical') {
      this.sendErrorReport(fullError);
    }
  }

  public trackBusinessEvent(eventName: string, value: number = 1, metadata: Record<string, any> = {}) {
    this.recordMetric({
      session_id: this.sessionId,
      metric_type: 'business',
      metric_name: eventName,
      value,
      unit: 'count',
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      device_type: this.getDeviceType(),
      metadata
    });
  }

  // ===== BATCH REPORTING =====
  private startBatchReporting() {
    // Send metrics every 30 seconds
    setInterval(() => {
      this.sendBatchMetrics();
    }, 30000);

    // Send on page unload
    window.addEventListener('beforeunload', () => {
      this.sendBatchMetrics();
    });
  }

  private async sendBatchMetrics() {
    if (this.metrics.length === 0 && this.errorReports.length === 0) return;

    try {
      // Send metrics
      if (this.metrics.length > 0) {
        await supabase.functions.invoke('store-rum-metrics', {
          body: { metrics: this.metrics }
        });
        this.metrics = [];
      }

      // Send error reports
      if (this.errorReports.length > 0) {
        await supabase.functions.invoke('store-error-reports', {
          body: { errors: this.errorReports }
        });
        this.errorReports = [];
      }
    } catch (error) {
      console.warn('Failed to send RUM data:', error);
    }
  }

  private async sendErrorReport(error: ErrorReport) {
    try {
      await supabase.functions.invoke('store-error-reports', {
        body: { errors: [error] }
      });
    } catch (e) {
      console.warn('Failed to send critical error report:', e);
    }
  }

  // ===== CONTROL METHODS =====
  public enable() {
    this.isEnabled = true;
  }

  public disable() {
    this.isEnabled = false;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getMetrics(): RUMMetric[] {
    return [...this.metrics];
  }

  public getErrors(): ErrorReport[] {
    return [...this.errorReports];
  }
}

// Export singleton instance
export const realUserMonitoring = RealUserMonitoring.getInstance();

// Export convenience functions
export const trackBusinessEvent = (eventName: string, value?: number, metadata?: Record<string, any>) =>
  realUserMonitoring.trackBusinessEvent(eventName, value, metadata);

export const reportError = (error: Omit<ErrorReport, 'id' | 'session_id' | 'timestamp' | 'page_url' | 'user_agent'>) =>
  realUserMonitoring.reportError(error);

export const recordMetric = (metric: Omit<RUMMetric, 'id'>) =>
  realUserMonitoring.recordMetric(metric);