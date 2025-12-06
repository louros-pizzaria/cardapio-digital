// ===== SISTEMA DE ANALYTICS AVANÇADO =====

interface UserEvent {
  id: string;
  userId?: string;
  sessionId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  page: string;
  referrer?: string;
  userAgent: string;
}

interface UserJourney {
  sessionId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  events: UserEvent[];
  pages: string[];
  duration: number;
  conversions: string[];
  abandonmentPoint?: string;
}

interface ConversionFunnel {
  name: string;
  steps: string[];
  conversions: Record<string, number>;
  dropOffRates: Record<string, number>;
  totalUsers: number;
  conversionRate: number;
}

interface ABTest {
  id: string;
  name: string;
  variants: string[];
  allocation: Record<string, number>;
  metrics: Record<string, Record<string, number>>;
  status: 'draft' | 'running' | 'completed';
  startDate: string;
  endDate?: string;
}

class AdvancedAnalytics {
  private static instance: AdvancedAnalytics;
  private events: UserEvent[] = [];
  private journeys: Map<string, UserJourney> = new Map();
  private sessionId: string;
  private pageStartTime: number = Date.now();
  private abTests: Map<string, ABTest> = new Map();

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
    this.setupABTests();
  }

  public static getInstance(): AdvancedAnalytics {
    if (!AdvancedAnalytics.instance) {
      AdvancedAnalytics.instance = new AdvancedAnalytics();
    }
    return AdvancedAnalytics.instance;
  }

  // ===== INICIALIZAR TRACKING =====
  private initializeTracking() {
    // Track page views automaticamente
    this.trackPageView();

    // Track clicks em elementos importantes
    document.addEventListener('click', (event) => {
      const target = event.target as Element;
      
      // Track button clicks
      if (target.tagName === 'BUTTON') {
        this.track('button_click', {
          text: target.textContent,
          class: target.className,
          id: target.id
        });
      }

      // Track link clicks
      if (target.tagName === 'A') {
        this.track('link_click', {
          href: (target as HTMLAnchorElement).href,
          text: target.textContent
        });
      }

      // Track CTA clicks
      if (target.hasAttribute('data-cta')) {
        this.track('cta_click', {
          cta: target.getAttribute('data-cta'),
          text: target.textContent
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.track('form_submit', {
        formId: form.id,
        formClass: form.className,
        action: form.action
      });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
        maxScroll = scrollPercent;
        this.track('scroll_depth', { depth: scrollPercent });
      }
    });

    // Track time on page
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - this.pageStartTime;
      this.track('page_exit', { timeOnPage });
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      this.track('visibility_change', {
        visible: !document.hidden,
        timestamp: Date.now()
      });
    });
  }

  // ===== TRACKING PRINCIPAL =====
  public track(event: string, properties: Record<string, any> = {}) {
    const userEvent: UserEvent = {
      id: this.generateEventId(),
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId,
      event,
      properties: {
        ...properties,
        timestamp: Date.now(),
        url: window.location.href,
        pathname: window.location.pathname
      },
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    };

    this.events.push(userEvent);
    this.updateUserJourney(userEvent);
    
    // Enviar para backend se em produção
    if (process.env.NODE_ENV === 'production') {
      this.sendEventToBackend(userEvent);
    }

    // Console log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', userEvent);
    }
  }

  // ===== TRACKING DE PÁGINA =====
  public trackPageView(page?: string) {
    const currentPage = page || window.location.pathname;
    this.pageStartTime = Date.now();
    
    this.track('page_view', {
      page: currentPage,
      title: document.title,
      referrer: document.referrer,
      loadTime: performance.now()
    });
  }

  // ===== TRACKING DE CONVERSÕES =====
  public trackConversion(conversionType: string, value?: number, properties: Record<string, any> = {}) {
    this.track('conversion', {
      conversionType,
      value,
      ...properties
    });

    // Atualizar journey com conversão
    const journey = this.journeys.get(this.sessionId);
    if (journey) {
      journey.conversions.push(conversionType);
    }
  }

  // ===== FUNIS DE CONVERSÃO =====
  public createConversionFunnel(name: string, steps: string[]): ConversionFunnel {
    const funnel: ConversionFunnel = {
      name,
      steps,
      conversions: {},
      dropOffRates: {},
      totalUsers: 0,
      conversionRate: 0
    };

    // Calcular conversões por etapa
    const usersByStep = new Map<string, Set<string>>();
    
    this.events.forEach(event => {
      if (steps.includes(event.event) && event.userId) {
        if (!usersByStep.has(event.event)) {
          usersByStep.set(event.event, new Set());
        }
        usersByStep.get(event.event)!.add(event.userId);
      }
    });

    let previousStepUsers = 0;
    steps.forEach((step, index) => {
      const stepUsers = usersByStep.get(step)?.size || 0;
      funnel.conversions[step] = stepUsers;
      
      if (index === 0) {
        funnel.totalUsers = stepUsers;
        previousStepUsers = stepUsers;
      } else {
        funnel.dropOffRates[step] = previousStepUsers > 0 
          ? ((previousStepUsers - stepUsers) / previousStepUsers) * 100 
          : 0;
        previousStepUsers = stepUsers;
      }
    });

    const finalStep = steps[steps.length - 1];
    funnel.conversionRate = funnel.totalUsers > 0 
      ? (funnel.conversions[finalStep] / funnel.totalUsers) * 100 
      : 0;

    return funnel;
  }

  // ===== JORNADA DO USUÁRIO =====
  private updateUserJourney(event: UserEvent) {
    let journey = this.journeys.get(this.sessionId);
    
    if (!journey) {
      journey = {
        sessionId: this.sessionId,
        userId: event.userId,
        startTime: event.timestamp,
        events: [],
        pages: [],
        duration: 0,
        conversions: []
      };
      this.journeys.set(this.sessionId, journey);
    }

    journey.events.push(event);
    
    if (event.event === 'page_view' && !journey.pages.includes(event.page)) {
      journey.pages.push(event.page);
    }

    if (event.event === 'conversion') {
      journey.conversions.push(event.properties.conversionType);
    }

    journey.duration = Date.now() - new Date(journey.startTime).getTime();
    journey.endTime = event.timestamp;
  }

  // ===== A/B TESTING =====
  private setupABTests() {
    // Configurar testes A/B padrão
    this.createABTest('checkout_button_color', {
      name: 'Checkout Button Color Test',
      variants: ['blue', 'green', 'red'],
      allocation: { blue: 33, green: 33, red: 34 },
      metrics: ['conversion', 'click_rate']
    });

    this.createABTest('product_page_layout', {
      name: 'Product Page Layout Test',
      variants: ['layout_a', 'layout_b'],
      allocation: { layout_a: 50, layout_b: 50 },
      metrics: ['time_on_page', 'add_to_cart']
    });
  }

  public createABTest(id: string, config: {
    name: string;
    variants: string[];
    allocation: Record<string, number>;
    metrics: string[];
  }) {
    const test: ABTest = {
      id,
      name: config.name,
      variants: config.variants,
      allocation: config.allocation,
      metrics: config.metrics.reduce((acc, metric) => {
        acc[metric] = config.variants.reduce((variants, variant) => {
          variants[variant] = 0;
          return variants;
        }, {} as Record<string, number>);
        return acc;
      }, {} as Record<string, Record<string, number>>),
      status: 'draft',
      startDate: new Date().toISOString()
    };

    this.abTests.set(id, test);
  }

  public getABTestVariant(testId: string): string | null {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') return null;

    // Usar hash do sessionId para garantir consistência
    const hash = this.hashCode(this.sessionId + testId);
    const random = Math.abs(hash) % 100;

    let cumulative = 0;
    for (const [variant, allocation] of Object.entries(test.allocation)) {
      cumulative += allocation;
      if (random < cumulative) {
        return variant;
      }
    }

    return test.variants[0]; // Fallback
  }

  public startABTest(testId: string) {
    const test = this.abTests.get(testId);
    if (test) {
      test.status = 'running';
      test.startDate = new Date().toISOString();
    }
  }

  public stopABTest(testId: string) {
    const test = this.abTests.get(testId);
    if (test) {
      test.status = 'completed';
      test.endDate = new Date().toISOString();
    }
  }

  // ===== ANÁLISE DE COMPORTAMENTO =====
  public getBehaviorAnalysis(): {
    popularPages: Array<{ page: string; views: number }>;
    commonPaths: Array<{ path: string[]; frequency: number }>;
    exitPages: Array<{ page: string; exits: number }>;
    averageSessionDuration: number;
    bounceRate: number;
  } {
    const pageViews = new Map<string, number>();
    const exitPages = new Map<string, number>();
    const sessionPaths = new Map<string, string[]>();
    let totalSessions = 0;
    let bouncedSessions = 0;
    let totalDuration = 0;

    this.journeys.forEach(journey => {
      totalSessions++;
      totalDuration += journey.duration;
      
      if (journey.pages.length === 1) {
        bouncedSessions++;
      }

      journey.pages.forEach(page => {
        pageViews.set(page, (pageViews.get(page) || 0) + 1);
      });

      if (journey.pages.length > 0) {
        const lastPage = journey.pages[journey.pages.length - 1];
        exitPages.set(lastPage, (exitPages.get(lastPage) || 0) + 1);
      }

      const pathKey = journey.pages.join(' -> ');
      sessionPaths.set(pathKey, journey.pages);
    });

    // Calcular caminhos mais comuns
    const pathFrequency = new Map<string, number>();
    sessionPaths.forEach((path, pathKey) => {
      pathFrequency.set(pathKey, (pathFrequency.get(pathKey) || 0) + 1);
    });

    return {
      popularPages: Array.from(pageViews.entries())
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      
      commonPaths: Array.from(pathFrequency.entries())
        .map(([pathKey, frequency]) => ({ 
          path: pathKey.split(' -> '), 
          frequency 
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10),
      
      exitPages: Array.from(exitPages.entries())
        .map(([page, exits]) => ({ page, exits }))
        .sort((a, b) => b.exits - a.exits)
        .slice(0, 10),
      
      averageSessionDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
      bounceRate: totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0
    };
  }

  // ===== UTILITÁRIOS =====
  private generateSessionId(): string {
    return sessionStorage.getItem('analytics_session_id') || (() => {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('analytics_session_id', id);
      return id;
    })();
  }

  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getCurrentUserId(): string | undefined {
    // Obter do contexto de autenticação se disponível
    return localStorage.getItem('user_id') || undefined;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  private async sendEventToBackend(event: UserEvent) {
    try {
      // Em produção, enviar para backend analytics
      console.log('Sending event to backend:', event);
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  // ===== MÉTODOS PÚBLICOS =====
  public getEvents(): UserEvent[] {
    return this.events;
  }

  public getJourneys(): UserJourney[] {
    return Array.from(this.journeys.values());
  }

  public getABTests(): ABTest[] {
    return Array.from(this.abTests.values());
  }

  public clearData() {
    this.events = [];
    this.journeys.clear();
    sessionStorage.removeItem('analytics_session_id');
  }
}

export const analytics = AdvancedAnalytics.getInstance();