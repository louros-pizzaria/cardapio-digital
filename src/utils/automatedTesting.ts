// ===== AUTOMATED TESTING SYSTEM =====

import { realUserMonitoring } from './realUserMonitoring';

export interface TestCase {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'visual' | 'performance' | 'accessibility';
  description: string;
  setup?: () => Promise<void>;
  test: () => Promise<boolean>;
  teardown?: () => Promise<void>;
  timeout: number;
  retries: number;
  tags: string[];
}

export interface TestResult {
  testId: string;
  passed: boolean;
  duration: number;
  error?: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface TestSuite {
  id: string;
  name: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

class AutomatedTestingSystem {
  private static instance: AutomatedTestingSystem;
  private testSuites: Map<string, TestSuite> = new Map();
  private testResults: TestResult[] = [];
  private isRunning: boolean = false;

  private constructor() {
    this.initializeDefaultTests();
  }

  public static getInstance(): AutomatedTestingSystem {
    if (!AutomatedTestingSystem.instance) {
      AutomatedTestingSystem.instance = new AutomatedTestingSystem();
    }
    return AutomatedTestingSystem.instance;
  }

  // ===== INICIALIZAR TESTES PADRÃO =====
  private initializeDefaultTests() {
    // E2E Tests
    this.registerTestSuite({
      id: 'e2e_critical_paths',
      name: 'Critical User Paths E2E Tests',
      tests: [
        {
          id: 'auth_flow',
          name: 'Authentication Flow',
          type: 'e2e',
          description: 'Test complete authentication flow',
          test: this.testAuthFlow.bind(this),
          timeout: 30000,
          retries: 2,
          tags: ['critical', 'auth']
        },
        {
          id: 'menu_browsing',
          name: 'Menu Browsing',
          type: 'e2e',
          description: 'Test menu navigation and product viewing',
          test: this.testMenuBrowsing.bind(this),
          timeout: 20000,
          retries: 1,
          tags: ['critical', 'menu']
        },
        {
          id: 'cart_checkout',
          name: 'Cart and Checkout',
          type: 'e2e',
          description: 'Test add to cart and checkout process',
          test: this.testCartCheckout.bind(this),
          timeout: 45000,
          retries: 2,
          tags: ['critical', 'checkout']
        }
      ]
    });

    // Performance Tests
    this.registerTestSuite({
      id: 'performance_tests',
      name: 'Performance Tests',
      tests: [
        {
          id: 'page_load_performance',
          name: 'Page Load Performance',
          type: 'performance',
          description: 'Test page load times meet performance budgets',
          test: this.testPageLoadPerformance.bind(this),
          timeout: 10000,
          retries: 1,
          tags: ['performance']
        },
        {
          id: 'api_response_times',
          name: 'API Response Times',
          type: 'performance',
          description: 'Test API endpoints respond within acceptable times',
          test: this.testAPIResponseTimes.bind(this),
          timeout: 15000,
          retries: 1,
          tags: ['performance', 'api']
        }
      ]
    });

    // Accessibility Tests
    this.registerTestSuite({
      id: 'accessibility_tests',
      name: 'Accessibility Tests',
      tests: [
        {
          id: 'keyboard_navigation',
          name: 'Keyboard Navigation',
          type: 'accessibility',
          description: 'Test keyboard navigation works correctly',
          test: this.testKeyboardNavigation.bind(this),
          timeout: 20000,
          retries: 1,
          tags: ['accessibility', 'keyboard']
        },
        {
          id: 'screen_reader_support',
          name: 'Screen Reader Support',
          type: 'accessibility',
          description: 'Test screen reader compatibility',
          test: this.testScreenReaderSupport.bind(this),
          timeout: 15000,
          retries: 1,
          tags: ['accessibility', 'screen-reader']
        }
      ]
    });

    // Visual Regression Tests
    this.registerTestSuite({
      id: 'visual_regression',
      name: 'Visual Regression Tests',
      tests: [
        {
          id: 'layout_consistency',
          name: 'Layout Consistency',
          type: 'visual',
          description: 'Test layout remains consistent across breakpoints',
          test: this.testLayoutConsistency.bind(this),
          timeout: 25000,
          retries: 1,
          tags: ['visual', 'responsive']
        }
      ]
    });
  }

  // ===== E2E TEST IMPLEMENTATIONS =====
  private async testAuthFlow(): Promise<boolean> {
    try {
      // Test login flow
      const loginButton = document.querySelector('[data-testid="login-button"]');
      if (!loginButton) throw new Error('Login button not found');

      // Simulate login interaction
      (loginButton as HTMLElement).click();
      
      // Wait for auth form
      await this.waitForElement('[data-testid="auth-form"]', 5000);
      
      // Test form validation
      const emailInput = document.querySelector('[data-testid="email-input"]') as HTMLInputElement;
      const passwordInput = document.querySelector('[data-testid="password-input"]') as HTMLInputElement;
      
      if (!emailInput || !passwordInput) {
        throw new Error('Auth form inputs not found');
      }

      // Test empty form validation
      const submitButton = document.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;
      submitButton?.click();
      
      // Check for validation errors
      await this.waitForElement('[data-testid="error-message"]', 2000);
      
      return true;
    } catch (error) {
      console.error('Auth flow test failed:', error);
      return false;
    }
  }

  private async testMenuBrowsing(): Promise<boolean> {
    try {
      // Navigate to menu
      window.history.pushState({}, '', '/menu');
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      // Wait for menu to load
      await this.waitForElement('[data-testid="menu-container"]', 10000);
      
      // Test category navigation
      const categories = document.querySelectorAll('[data-testid="category-button"]');
      if (categories.length === 0) throw new Error('No menu categories found');
      
      // Click first category
      (categories[0] as HTMLElement).click();
      
      // Wait for products to load
      await this.waitForElement('[data-testid="product-card"]', 5000);
      
      // Test product modal
      const firstProduct = document.querySelector('[data-testid="product-card"]');
      if (firstProduct) {
        (firstProduct as HTMLElement).click();
        await this.waitForElement('[data-testid="product-modal"]', 3000);
      }
      
      return true;
    } catch (error) {
      console.error('Menu browsing test failed:', error);
      return false;
    }
  }

  private async testCartCheckout(): Promise<boolean> {
    try {
      // Add item to cart (simulate)
      const addToCartButton = document.querySelector('[data-testid="add-to-cart"]');
      if (addToCartButton) {
        (addToCartButton as HTMLElement).click();
      }
      
      // Open cart
      const cartButton = document.querySelector('[data-testid="cart-button"]');
      if (!cartButton) throw new Error('Cart button not found');
      
      (cartButton as HTMLElement).click();
      
      // Wait for cart drawer
      await this.waitForElement('[data-testid="cart-drawer"]', 3000);
      
      // Test checkout button
      const checkoutButton = document.querySelector('[data-testid="checkout-button"]');
      if (checkoutButton && !(checkoutButton as HTMLButtonElement).disabled) {
        (checkoutButton as HTMLElement).click();
        
        // Wait for checkout page
        await this.waitForElement('[data-testid="checkout-form"]', 5000);
      }
      
      return true;
    } catch (error) {
      console.error('Cart checkout test failed:', error);
      return false;
    }
  }

  // ===== PERFORMANCE TEST IMPLEMENTATIONS =====
  private async testPageLoadPerformance(): Promise<boolean> {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (!navigation) {
        throw new Error('Navigation timing not available');
      }

      const metrics = {
        domComplete: navigation.domComplete - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstByte: navigation.responseStart - navigation.fetchStart
      };

      // Check performance budgets
      const budgets = {
        domComplete: 3000,
        loadComplete: 5000,
        firstByte: 1000
      };

      const violations = Object.entries(metrics).filter(([key, value]) => 
        value > budgets[key as keyof typeof budgets]
      );

      if (violations.length > 0) {
        console.warn('Performance budget violations:', violations);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Page load performance test failed:', error);
      return false;
    }
  }

  private async testAPIResponseTimes(): Promise<boolean> {
    try {
      const testEndpoints = [
        '/api/menu',
        '/api/user/profile',
        '/api/orders'
      ];

      const results = await Promise.all(
        testEndpoints.map(async (endpoint) => {
          const startTime = performance.now();
          
          try {
            await fetch(endpoint);
            const endTime = performance.now();
            return { endpoint, responseTime: endTime - startTime, success: true };
          } catch (error) {
            return { endpoint, responseTime: 0, success: false };
          }
        })
      );

      const slowResponses = results.filter(result => 
        result.success && result.responseTime > 2000
      );

      if (slowResponses.length > 0) {
        console.warn('Slow API responses:', slowResponses);
        return false;
      }

      return true;
    } catch (error) {
      console.error('API response time test failed:', error);
      return false;
    }
  }

  // ===== ACCESSIBILITY TEST IMPLEMENTATIONS =====
  private async testKeyboardNavigation(): Promise<boolean> {
    try {
      // Get all focusable elements
      const focusableElements = this.getFocusableElements();
      
      if (focusableElements.length === 0) {
        throw new Error('No focusable elements found');
      }

      // Test tab navigation
      let currentIndex = 0;
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      
      for (let i = 0; i < Math.min(10, focusableElements.length); i++) {
        document.dispatchEvent(tabEvent);
        
        // Check if focus moved correctly
        const activeElement = document.activeElement;
        if (!activeElement || !focusableElements.includes(activeElement as HTMLElement)) {
          console.warn('Keyboard navigation issue at element', i);
          return false;
        }
        
        currentIndex++;
      }

      return true;
    } catch (error) {
      console.error('Keyboard navigation test failed:', error);
      return false;
    }
  }

  private async testScreenReaderSupport(): Promise<boolean> {
    try {
      const issues: string[] = [];

      // Check for alt text on images
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.alt && !img.hasAttribute('aria-label')) {
          issues.push(`Image ${index} missing alt text`);
        }
      });

      // Check for form labels
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input, index) => {
        const element = input as HTMLElement;
        if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
          const label = document.querySelector(`label[for="${element.id}"]`);
          if (!label) {
            issues.push(`Form element ${index} missing label`);
          }
        }
      });

      // Check for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.substring(1));
        if (level > previousLevel + 1) {
          issues.push(`Heading hierarchy issue at heading ${index}`);
        }
        previousLevel = level;
      });

      if (issues.length > 0) {
        console.warn('Accessibility issues found:', issues);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Screen reader support test failed:', error);
      return false;
    }
  }

  // ===== VISUAL REGRESSION TEST IMPLEMENTATIONS =====
  private async testLayoutConsistency(): Promise<boolean> {
    try {
      const breakpoints = [320, 768, 1024, 1440];
      const originalWidth = window.innerWidth;
      const issues: string[] = [];

      for (const breakpoint of breakpoints) {
        // Simulate viewport resize
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: breakpoint
        });
        
        window.dispatchEvent(new Event('resize'));
        
        // Wait for layout to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check for layout issues
        const overflowElements = this.findOverflowingElements();
        if (overflowElements.length > 0) {
          issues.push(`Layout overflow at ${breakpoint}px: ${overflowElements.length} elements`);
        }
        
        const hiddenText = this.findHiddenText();
        if (hiddenText.length > 0) {
          issues.push(`Hidden text at ${breakpoint}px: ${hiddenText.length} elements`);
        }
      }

      // Restore original width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalWidth
      });
      window.dispatchEvent(new Event('resize'));

      if (issues.length > 0) {
        console.warn('Layout consistency issues:', issues);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Layout consistency test failed:', error);
      return false;
    }
  }

  // ===== UTILITY METHODS =====
  private async waitForElement(selector: string, timeout: number): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  private getFocusableElements(): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button',
      'input',
      'textarea',
      'select',
      '[tabindex]:not([tabindex="-1"])'
    ];

    const elements: HTMLElement[] = [];
    focusableSelectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      elements.forEach(el => {
        const element = el as HTMLElement;
        const isDisabled = element.hasAttribute('disabled') || 
                          (element as any).disabled === true;
        if (this.isElementVisible(element) && !isDisabled) {
          elements.push(element);
        }
      });
    });

    return elements;
  }

  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  private findOverflowingElements(): HTMLElement[] {
    const elements = document.querySelectorAll('*');
    const overflowing: HTMLElement[] = [];

    elements.forEach(element => {
      const el = element as HTMLElement;
      const rect = el.getBoundingClientRect();
      
      if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
        overflowing.push(el);
      }
    });

    return overflowing;
  }

  private findHiddenText(): HTMLElement[] {
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    const hidden: HTMLElement[] = [];

    textElements.forEach(element => {
      const el = element as HTMLElement;
      if (el.textContent && el.textContent.trim() && !this.isElementVisible(el)) {
        hidden.push(el);
      }
    });

    return hidden;
  }

  // ===== PUBLIC METHODS =====
  public registerTestSuite(suite: TestSuite) {
    this.testSuites.set(suite.id, suite);
  }

  public async runTestSuite(suiteId: string): Promise<TestResult[]> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const results: TestResult[] = [];

    try {
      // Run beforeAll hook
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      // Run each test
      for (const test of suite.tests) {
        const result = await this.runTest(test, suite);
        results.push(result);
        this.testResults.push(result);
      }

      // Run afterAll hook
      if (suite.afterAll) {
        await suite.afterAll();
      }

    } catch (error) {
      console.error(`Test suite ${suiteId} failed:`, error);
    }

    return results;
  }

  private async runTest(test: TestCase, suite: TestSuite): Promise<TestResult> {
    const startTime = performance.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= test.retries) {
      try {
        // Run beforeEach hook
        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        // Run test setup
        if (test.setup) {
          await test.setup();
        }

        // Run the actual test with timeout
        const testPromise = test.test();
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), test.timeout)
        );

        const passed = await Promise.race([testPromise, timeoutPromise]);
        const endTime = performance.now();

        // Run test teardown
        if (test.teardown) {
          await test.teardown();
        }

        // Run afterEach hook
        if (suite.afterEach) {
          await suite.afterEach();
        }

        const result: TestResult = {
          testId: test.id,
          passed,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
          metadata: {
            attempt: attempt + 1,
            type: test.type,
            tags: test.tags
          }
        };

        // Report to monitoring
        realUserMonitoring.recordMetric({
          session_id: realUserMonitoring.getSessionId(),
          metric_type: 'business',
          metric_name: 'automated_test_result',
          value: passed ? 1 : 0,
          unit: 'boolean',
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          device_type: this.getDeviceType(),
          metadata: {
            test_id: test.id,
            test_type: test.type,
            duration: result.duration,
            attempt: attempt + 1
          }
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt <= test.retries) {
          console.warn(`Test ${test.id} failed, retrying... (attempt ${attempt})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
    }

    // All attempts failed
    const endTime = performance.now();
    return {
      testId: test.id,
      passed: false,
      duration: endTime - startTime,
      error: lastError?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      metadata: {
        attempts: attempt,
        type: test.type,
        tags: test.tags
      }
    };
  }

  public async runAllTests(): Promise<Map<string, TestResult[]>> {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    const allResults = new Map<string, TestResult[]>();

    try {
      for (const [suiteId] of this.testSuites) {
        const results = await this.runTestSuite(suiteId);
        allResults.set(suiteId, results);
      }
    } finally {
      this.isRunning = false;
    }

    return allResults;
  }

  public getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  public getTestSuites(): TestSuite[] {
    return Array.from(this.testSuites.values());
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
}

// Export singleton instance
export const automatedTesting = AutomatedTestingSystem.getInstance();

// Export convenience functions
export const runTests = () => automatedTesting.runAllTests();
export const registerTest = (suite: TestSuite) => automatedTesting.registerTestSuite(suite);
export const getTestResults = () => automatedTesting.getTestResults();