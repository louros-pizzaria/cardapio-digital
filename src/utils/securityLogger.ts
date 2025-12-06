// ===== SISTEMA DE LOGS DE SEGURANÇA =====

import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  action: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

class SecurityLogger {
  private static instance: SecurityLogger;

  private constructor() {}

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Log de eventos de segurança
   */
  async logEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log local sempre
      console.log(`[SECURITY-${event.severity?.toUpperCase() || 'INFO'}] ${event.action}:`, {
        timestamp: new Date().toISOString(),
        ...event.details
      });

      // Tentar salvar no banco apenas se autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      // Preparar dados para salvar no banco
      const logData = {
        action: event.action,
        details: event.details || {},
        user_id: user?.id || null,
        ip_address: null, // Será capturado pelo servidor se disponível
        user_agent: navigator.userAgent
      };

      // Salvar no banco de dados
      const { error } = await supabase.functions.invoke('log-security-event', {
        body: logData
      });

      if (error) {
        console.warn('Failed to save security log to database:', error);
      }

    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Log de tentativas de login
   */
  async logLoginAttempt(email: string, success: boolean, errorMessage?: string): Promise<void> {
    await this.logEvent({
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      details: {
        email,
        error: errorMessage,
        timestamp: Date.now()
      },
      severity: success ? 'low' : 'medium'
    });
  }

  /**
   * Log de bloqueio de conta
   */
  async logAccountBlock(email: string, attemptCount: number): Promise<void> {
    await this.logEvent({
      action: 'ACCOUNT_BLOCKED',
      details: {
        email,
        attemptCount,
        blockDuration: '15 minutes',
        timestamp: Date.now()
      },
      severity: 'high'
    });
  }

  /**
   * Log de recuperação de senha
   */
  async logPasswordReset(email: string, success: boolean): Promise<void> {
    await this.logEvent({
      action: success ? 'PASSWORD_RESET_SUCCESS' : 'PASSWORD_RESET_FAILED',
      details: {
        email,
        timestamp: Date.now()
      },
      severity: 'medium'
    });
  }

  /**
   * Log de ações suspeitas
   */
  async logSuspiciousActivity(action: string, details: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: 'SUSPICIOUS_ACTIVITY',
      details: {
        suspiciousAction: action,
        ...details,
        timestamp: Date.now()
      },
      severity: 'critical'
    });
  }

  /**
   * Log de alterações de perfil
   */
  async logProfileChange(changes: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: 'PROFILE_UPDATED',
      details: {
        changes,
        timestamp: Date.now()
      },
      severity: 'low'
    });
  }

  /**
   * Log de tentativas de acesso não autorizado
   */
  async logUnauthorizedAccess(resource: string, attemptedAction: string): Promise<void> {
    await this.logEvent({
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      details: {
        resource,
        attemptedAction,
        timestamp: Date.now()
      },
      severity: 'high'
    });
  }
}

// Exportar instância singleton
export const securityLogger = SecurityLogger.getInstance();

// Exportar funções de conveniência
export const logLoginAttempt = (email: string, success: boolean, error?: string) => 
  securityLogger.logLoginAttempt(email, success, error);

export const logAccountBlock = (email: string, attempts: number) => 
  securityLogger.logAccountBlock(email, attempts);

export const logPasswordReset = (email: string, success: boolean) => 
  securityLogger.logPasswordReset(email, success);

export const logSuspiciousActivity = (action: string, details: Record<string, any>) => 
  securityLogger.logSuspiciousActivity(action, details);

export const logProfileChange = (changes: Record<string, any>) => 
  securityLogger.logProfileChange(changes);

export const logUnauthorizedAccess = (resource: string, action: string) => 
  securityLogger.logUnauthorizedAccess(resource, action);