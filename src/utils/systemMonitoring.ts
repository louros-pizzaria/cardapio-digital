// ===== SISTEMA DE MONITORAMENTO PROATIVO =====

import { supabase } from '@/integrations/supabase/client';

export interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
}

export interface SystemAlert {
  id: string;
  type: 'webhook_failure' | 'auth_issue' | 'performance' | 'security' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  createdAt: string;
  resolvedAt?: string;
  acknowledged: boolean;
}

class SystemMonitor {
  private static instance: SystemMonitor;
  private metrics: Map<string, SystemMetric> = new Map();
  private alerts: SystemAlert[] = [];
  private listeners: Set<(alerts: SystemAlert[]) => void> = new Set();

  private constructor() {
    this.initializeMetrics();
    this.startMonitoring();
  }

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  // ===== INICIALIZAR MÉTRICAS =====
  private initializeMetrics() {
    const defaultMetrics: Omit<SystemMetric, 'id' | 'lastUpdated' | 'trend'>[] = [
      {
        name: 'Response Time',
        value: 0,
        unit: 'ms',
        threshold: { warning: 1000, critical: 3000 },
        status: 'healthy'
      },
      {
        name: 'Error Rate',
        value: 0,
        unit: '%',
        threshold: { warning: 5, critical: 10 },
        status: 'healthy'
      },
      {
        name: 'Active Users',
        value: 0,
        unit: 'users',
        threshold: { warning: 0, critical: 0 },
        status: 'healthy'
      },
      {
        name: 'Memory Usage',
        value: 0,
        unit: 'MB',
        threshold: { warning: 80, critical: 95 },
        status: 'healthy'
      },
      {
        name: 'Database Connections',
        value: 0,
        unit: 'connections',
        threshold: { warning: 80, critical: 95 },
        status: 'healthy'
      },
      {
        name: 'Webhook Success Rate',
        value: 100,
        unit: '%',
        threshold: { warning: 95, critical: 90 },
        status: 'healthy'
      }
    ];

    defaultMetrics.forEach(metric => {
      const fullMetric: SystemMetric = {
        ...metric,
        id: metric.name.toLowerCase().replace(/\s+/g, '_'),
        lastUpdated: new Date().toISOString(),
        trend: 'stable'
      };
      this.metrics.set(fullMetric.id, fullMetric);
    });
  }

  // ===== INICIAR MONITORAMENTO =====
  private startMonitoring() {
    // Monitoramento de performance da API
    this.monitorAPIPerformance();
    
    // Monitoramento de webhooks
    this.monitorWebhooks();
    
    // Monitoramento de autenticação
    this.monitorAuthentication();
    
    // Monitoramento de recursos do sistema
    this.monitorSystemResources();
    
    // Verificação periódica
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // A cada 30 segundos
  }

  // ===== MONITORAR PERFORMANCE DA API =====
  private monitorAPIPerformance() {
    const originalFetch = window.fetch;
    let requestTimes: number[] = [];
    let errorCount = 0;
    let totalRequests = 0;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      totalRequests++;

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        requestTimes.push(responseTime);
        if (requestTimes.length > 50) requestTimes.shift(); // Manter apenas últimas 50

        // Atualizar métrica de tempo de resposta
        const avgResponseTime = requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length;
        this.updateMetric('response_time', avgResponseTime);

        if (!response.ok) {
          errorCount++;
        }

        // Atualizar taxa de erro
        const errorRate = (errorCount / totalRequests) * 100;
        this.updateMetric('error_rate', errorRate);

        return response;
      } catch (error) {
        errorCount++;
        const errorRate = (errorCount / totalRequests) * 100;
        this.updateMetric('error_rate', errorRate);
        throw error;
      }
    };
  }

  // ===== MONITORAR WEBHOOKS =====
  private async monitorWebhooks() {
    try {
      const { data: webhookLogs } = await supabase
        .from('webhook_logs')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (webhookLogs) {
        const totalWebhooks = webhookLogs.length;
        const successfulWebhooks = webhookLogs.filter(log => log.status === 'success').length;
        const successRate = totalWebhooks > 0 ? (successfulWebhooks / totalWebhooks) * 100 : 100;
        
        this.updateMetric('webhook_success_rate', successRate);

        // Verificar falhas recentes
        const recentFailures = webhookLogs.filter(log => 
          log.status === 'failed' && 
          new Date(log.created_at) > new Date(Date.now() - 60 * 60 * 1000) // Última hora
        );

        if (recentFailures.length > 5) {
          this.createAlert({
            type: 'webhook_failure',
            severity: 'high',
            message: `${recentFailures.length} webhook failures in the last hour`,
            details: { failureCount: recentFailures.length }
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring webhooks:', error);
    }
  }

  // ===== MONITORAR AUTENTICAÇÃO =====
  private async monitorAuthentication() {
    try {
      const { data: securityLogs } = await supabase
        .from('security_logs')
        .select('action, created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Última hora
        .order('created_at', { ascending: false });

      if (securityLogs) {
        const failedLogins = securityLogs.filter(log => log.action === 'LOGIN_FAILED');
        const suspiciousActivity = securityLogs.filter(log => log.action === 'SUSPICIOUS_ACTIVITY');

        if (failedLogins.length > 10) {
          this.createAlert({
            type: 'auth_issue',
            severity: 'medium',
            message: `High number of failed login attempts: ${failedLogins.length}`,
            details: { failedLoginCount: failedLogins.length }
          });
        }

        if (suspiciousActivity.length > 0) {
          this.createAlert({
            type: 'security',
            severity: 'high',
            message: `Suspicious activity detected: ${suspiciousActivity.length} incidents`,
            details: { incidents: suspiciousActivity.length }
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring authentication:', error);
    }
  }

  // ===== MONITORAR RECURSOS DO SISTEMA =====
  private monitorSystemResources() {
    // Simular monitoramento de recursos (em produção, vir de APIs de monitoramento)
    const updateResources = () => {
      // Memory usage (simulado)
      const memoryUsage = Math.random() * 100;
      this.updateMetric('memory_usage', memoryUsage);

      // Database connections (simulado)
      const dbConnections = Math.floor(Math.random() * 100);
      this.updateMetric('database_connections', dbConnections);

      // Active users (simulado baseado em atividade recente)
      const activeUsers = Math.floor(Math.random() * 50);
      this.updateMetric('active_users', activeUsers);
    };

    updateResources();
    setInterval(updateResources, 60000); // A cada minuto
  }

  // ===== VERIFICAÇÃO DE SAÚDE =====
  private async performHealthCheck() {
    try {
      // Verificar conectividade com Supabase
      const startTime = performance.now();
      const { error } = await supabase.from('profiles').select('count').limit(1);
      const endTime = performance.now();

      if (error) {
        this.createAlert({
          type: 'system',
          severity: 'critical',
          message: 'Database connectivity issue',
          details: { error: error.message }
        });
      } else {
        const dbResponseTime = endTime - startTime;
        if (dbResponseTime > 5000) {
          this.createAlert({
            type: 'performance',
            severity: 'medium',
            message: `Slow database response: ${dbResponseTime.toFixed(0)}ms`,
            details: { responseTime: dbResponseTime }
          });
        }
      }
    } catch (error) {
      this.createAlert({
        type: 'system',
        severity: 'critical',
        message: 'Health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  // ===== ATUALIZAR MÉTRICA =====
  private updateMetric(id: string, value: number) {
    const metric = this.metrics.get(id);
    if (!metric) return;

    const oldValue = metric.value;
    const status = this.getMetricStatus(value, metric.threshold);
    const trend = value > oldValue ? 'up' : value < oldValue ? 'down' : 'stable';

    const updatedMetric: SystemMetric = {
      ...metric,
      value,
      status,
      trend,
      lastUpdated: new Date().toISOString()
    };

    this.metrics.set(id, updatedMetric);

    // Criar alerta se métrica estiver em estado crítico
    if (status === 'critical' && metric.status !== 'critical') {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        message: `${metric.name} is in critical state: ${value}${metric.unit}`,
        details: { metric: id, value, threshold: metric.threshold.critical }
      });
    }
  }

  // ===== DETERMINAR STATUS DA MÉTRICA =====
  private getMetricStatus(value: number, threshold: { warning: number; critical: number }): SystemMetric['status'] {
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'healthy';
  }

  // ===== CRIAR ALERTA =====
  private createAlert(alertData: Omit<SystemAlert, 'id' | 'createdAt' | 'acknowledged'>) {
    const alert: SystemAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      acknowledged: false
    };

    this.alerts.unshift(alert);
    
    // Manter apenas últimos 100 alertas
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Notificar listeners
    this.notifyListeners();

    // Log para console em desenvolvimento
    console.warn('System Alert:', alert);
  }

  // ===== MÉTODOS PÚBLICOS =====
  public getMetrics(): SystemMetric[] {
    return Array.from(this.metrics.values());
  }

  public getAlerts(): SystemAlert[] {
    return this.alerts;
  }

  public acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notifyListeners();
    }
  }

  public resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date().toISOString();
      this.notifyListeners();
    }
  }

  public subscribe(callback: (alerts: SystemAlert[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.alerts));
  }

  // ===== ANÁLISE DE TENDÊNCIAS =====
  public getSystemHealth(): {
    overall: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
  } {
    const metrics = this.getMetrics();
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    const healthyCount = metrics.filter(m => m.status === 'healthy').length;

    let overall: 'healthy' | 'warning' | 'critical';
    let score: number;

    if (criticalCount > 0) {
      overall = 'critical';
      score = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));
    } else if (warningCount > 0) {
      overall = 'warning';
      score = Math.max(60, 100 - (warningCount * 15));
    } else {
      overall = 'healthy';
      score = 100;
    }

    const issues = metrics
      .filter(m => m.status !== 'healthy')
      .map(m => `${m.name}: ${m.value}${m.unit}`);

    return { overall, score, issues };
  }
}

export const systemMonitor = SystemMonitor.getInstance();