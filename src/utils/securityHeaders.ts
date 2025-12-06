// ===== SECURITY HEADERS CONFIGURATION =====

export interface SecurityConfig {
  contentSecurityPolicy: {
    directives: Record<string, string[]>;
    reportOnly: boolean;
  };
  permissionsPolicy: Record<string, string[]>;
  referrerPolicy: string;
  crossOriginEmbedderPolicy: string;
  crossOriginOpenerPolicy: string;
  crossOriginResourcePolicy: string;
}

class SecurityHeadersManager {
  private static instance: SecurityHeadersManager;
  private config: SecurityConfig;

  private constructor() {
    this.config = this.getSecurityConfig();
    this.applySecurityHeaders();
  }

  public static getInstance(): SecurityHeadersManager {
    if (!SecurityHeadersManager.instance) {
      SecurityHeadersManager.instance = new SecurityHeadersManager();
    }
    return SecurityHeadersManager.instance;
  }

  private getSecurityConfig(): SecurityConfig {
    const isDevelopment = import.meta.env.DEV;
    const supabaseUrl = 'https://xpgsfovrxguphlvncgwn.supabase.co';
    const supabaseWssUrl = supabaseUrl.replace('https://', 'wss://');
    
    return {
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': [
            "'self'",
            "'unsafe-inline'", // Required for Vite in development
            "'unsafe-eval'", // Required for development
            'https://js.mercadopago.com',
            'https://sdk.mercadopago.com',
            'https://js.stripe.com',
            'https://m.stripe.network',
            ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])
          ],
          'style-src': [
            "'self'",
            "'unsafe-inline'", // Required for styled-components and CSS-in-JS
            'https://fonts.googleapis.com'
          ],
          'font-src': [
            "'self'",
            'https://fonts.gstatic.com',
            'data:'
          ],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https:',
            supabaseUrl
          ],
          'connect-src': [
            "'self'",
            supabaseUrl,
            supabaseWssUrl,
            'wss://realtime-pooler.supabase.com',
            'https://api.mercadopago.com',
            'https://api.stripe.com',
            'https://m.stripe.network',
            'https://api.whatsapp.com',
            ...(isDevelopment ? ['ws://localhost:*', 'http://localhost:*'] : [])
          ],
          'frame-src': [
            "'self'",
            'https://js.stripe.com',
            'https://hooks.stripe.com'
          ],
          'worker-src': [
            "'self'",
            'blob:'
          ],
          'manifest-src': ["'self'"],
          'media-src': ["'self'", 'data:', 'blob:'],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': []
        },
        reportOnly: isDevelopment
      },
      permissionsPolicy: {
        'accelerometer': [],
        'autoplay': ['self'],
        'camera': ['self'],
        'encrypted-media': ['self'],
        'fullscreen': ['self'],
        'geolocation': ['self'],
        'gyroscope': [],
        'magnetometer': [],
        'microphone': ['self'],
        'midi': [],
        'payment': ['self'],
        'picture-in-picture': ['self'],
        'usb': [],
        'web-share': ['self']
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      crossOriginEmbedderPolicy: 'credentialless',
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      crossOriginResourcePolicy: 'cross-origin'
    };
  }

  private applySecurityHeaders() {
    // CSP
    this.applyContentSecurityPolicy();
    
    // Permissions Policy
    this.applyPermissionsPolicy();
    
    // Other security headers via meta tags
    this.applyAdditionalHeaders();
    
    // Subresource Integrity
    this.setupSubresourceIntegrity();
    
    // Runtime security checks
    this.setupRuntimeSecurity();
  }

  private applyContentSecurityPolicy() {
    const csp = this.config.contentSecurityPolicy;
    const policyString = Object.entries(csp.directives)
      .map(([directive, sources]) => 
        sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
      )
      .join('; ');

    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
    metaTag.content = policyString;
    document.head.appendChild(metaTag);

    // Add CSP violation reporting
    document.addEventListener('securitypolicyviolation', (event) => {
      console.warn('CSP Violation:', {
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        originalPolicy: event.originalPolicy
      });

      // Report to monitoring system
      this.reportSecurityViolation('csp', {
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber
      });
    });
  }

  private applyPermissionsPolicy() {
    const policy = this.config.permissionsPolicy;
    const policyString = Object.entries(policy)
      .map(([feature, allowlist]) => {
        if (allowlist.length === 0) return `${feature}=()`;
        const origins = allowlist.map(origin => origin === 'self' ? 'self' : `"${origin}"`).join(' ');
        return `${feature}=(${origins})`;
      })
      .join(', ');

    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'Permissions-Policy';
    metaTag.content = policyString;
    document.head.appendChild(metaTag);
  }

  private applyAdditionalHeaders() {
    // NOTE: X-Frame-Options, Strict-Transport-Security, and X-XSS-Protection 
    // only work via HTTP headers, not meta tags. They are removed here to avoid
    // browser warnings. These should be configured at the server/CDN level.
    const headers = [
      { name: 'Referrer-Policy', value: this.config.referrerPolicy },
      { name: 'X-Content-Type-Options', value: 'nosniff' }
    ];

    headers.forEach(header => {
      const metaTag = document.createElement('meta');
      metaTag.httpEquiv = header.name;
      metaTag.content = header.value;
      document.head.appendChild(metaTag);
    });
  }

  private setupSubresourceIntegrity() {
    // Monitor external scripts for integrity
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check external scripts
            if (element.tagName === 'SCRIPT' && element.hasAttribute('src')) {
              const src = element.getAttribute('src');
              if (src && this.isExternalResource(src) && !element.hasAttribute('integrity')) {
                console.warn('External script loaded without integrity check:', src);
                this.reportSecurityViolation('sri', { resource: src, type: 'script' });
              }
            }
            
            // Check external stylesheets
            if (element.tagName === 'LINK' && element.getAttribute('rel') === 'stylesheet') {
              const href = element.getAttribute('href');
              if (href && this.isExternalResource(href) && !element.hasAttribute('integrity')) {
                console.warn('External stylesheet loaded without integrity check:', href);
                this.reportSecurityViolation('sri', { resource: href, type: 'stylesheet' });
              }
            }
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  private setupRuntimeSecurity() {
    // Detect potential XSS attempts
    this.setupXSSDetection();
    
    // Monitor for suspicious DOM modifications
    this.setupDOMMonitoring();
    
    // Check for clickjacking
    this.setupClickjackingProtection();
    
    // Monitor console usage (potential code injection)
    this.setupConsoleMonitoring();
  }

  private setupXSSDetection() {
    // Monitor for suspicious URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.forEach((value, key) => {
      if (this.containsSuspiciousContent(value)) {
        console.warn('Suspicious URL parameter detected:', { key, value });
        this.reportSecurityViolation('xss_attempt', { parameter: key, value });
      }
    });

    // Monitor DOM modifications for script injection
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Check for inline scripts
            if (element.tagName === 'SCRIPT' && !element.hasAttribute('src')) {
              const content = element.textContent || '';
              if (this.containsSuspiciousContent(content)) {
                console.warn('Suspicious inline script detected');
                this.reportSecurityViolation('xss_attempt', { type: 'inline_script', content });
              }
            }
            
            // Check for suspicious attributes
            Array.from(element.attributes).forEach(attr => {
              if (attr.name.startsWith('on') && this.containsSuspiciousContent(attr.value)) {
                console.warn('Suspicious event handler detected:', attr.name, attr.value);
                this.reportSecurityViolation('xss_attempt', { type: 'event_handler', attribute: attr.name, value: attr.value });
              }
            });
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['onclick', 'onload', 'onerror', 'onmouseover']
    });
  }

  private setupDOMMonitoring() {
    let modificationCount = 0;
    const resetInterval = 10000; // 10 seconds
    const threshold = 100; // modifications per interval

    const observer = new MutationObserver(() => {
      modificationCount++;
      
      if (modificationCount > threshold) {
        console.warn('Excessive DOM modifications detected - possible attack');
        this.reportSecurityViolation('dom_manipulation', { modifications: modificationCount });
        modificationCount = 0;
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });

    setInterval(() => {
      modificationCount = 0;
    }, resetInterval);
  }

  private setupClickjackingProtection() {
    // Check if page is in an iframe
    if (window.self !== window.top) {
      // Ignore if running in Lovable preview/development environment
      const referrer = document.referrer || '';
      const isLovablePreview = referrer.includes('lovable.dev') || 
                               referrer.includes('lovable.app') || 
                               referrer.includes('lovableproject.com');
      
      if (!isLovablePreview) {
        console.warn('Page loaded in iframe - potential clickjacking attempt');
        this.reportSecurityViolation('clickjacking', { 
          referrer: document.referrer,
          parentOrigin: window.location.ancestorOrigins?.[0] || 'unknown'
        });
      }
      
      // Optional: Break out of iframe
      // window.top.location = window.self.location;
    }
  }

  private setupConsoleMonitoring() {
    const originalConsole = { ...console };
    
    ['log', 'warn', 'error', 'info'].forEach(method => {
      (console as any)[method] = (...args: any[]) => {
        // Check for potential code injection attempts
        const message = args.join(' ');
        if (this.containsSuspiciousContent(message)) {
          this.reportSecurityViolation('console_injection', { method, message });
        }
        
        return (originalConsole as any)[method](...args);
      };
    });
  }

  private containsSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /function\s*\(/i,
      /new\s+Function/i,
      /document\.write/i,
      /innerHTML\s*=/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private isExternalResource(url: string): boolean {
    try {
      const resourceUrl = new URL(url, window.location.origin);
      return resourceUrl.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  private reportSecurityViolation(type: string, details: any) {
    // Report to Real User Monitoring system
    import('./realUserMonitoring').then(({ reportError }) => {
      reportError({
        error_type: 'security',
        message: `Security violation: ${type}`,
        severity: 'high',
        metadata: { violation_type: type, ...details }
      });
    });
  }

  // ===== PUBLIC METHODS =====
  public updateConfig(newConfig: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.applySecurityHeaders();
  }

  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  public validateResource(url: string): boolean {
    // Check if resource is allowed by CSP
    try {
      const resourceUrl = new URL(url, window.location.origin);
      const directive = this.getCSPDirectiveForResource(resourceUrl);
      const allowedSources = this.config.contentSecurityPolicy.directives[directive] || [];
      
      return allowedSources.some(source => {
        if (source === "'self'") return resourceUrl.origin === window.location.origin;
        if (source === "*") return true;
        if (source.startsWith("'")) return false; // Skip other keywords
        return resourceUrl.origin === source || resourceUrl.href.startsWith(source);
      });
    } catch {
      return false;
    }
  }

  private getCSPDirectiveForResource(url: URL): string {
    const extension = url.pathname.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js': return 'script-src';
      case 'css': return 'style-src';
      case 'woff': case 'woff2': case 'ttf': case 'eot': return 'font-src';
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return 'img-src';
      case 'mp4': case 'webm': case 'ogg': case 'mp3': case 'wav': return 'media-src';
      default: return 'default-src';
    }
  }
}

// Export singleton instance
export const securityHeaders = SecurityHeadersManager.getInstance();

// Export convenience functions
export const validateResource = (url: string) => securityHeaders.validateResource(url);
export const updateSecurityConfig = (config: Partial<SecurityConfig>) => securityHeaders.updateConfig(config);
export const getSecurityConfig = () => securityHeaders.getConfig();
