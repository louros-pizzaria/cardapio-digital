// ===== HOOK PARA ALERTAS DE SEGURANÇA EM TEMPO REAL =====

import { useState, useEffect } from 'react';
import { securityLogger } from '@/utils/securityLogger';
import { useToast } from './use-toast';

interface SecurityAlert {
  type: 'real_time' | 'pattern' | 'threshold';
  message: string;
  severity: 'warning' | 'error' | 'critical';
  data?: any;
  timestamp?: string;
}

export const useSecurityAlerts = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [lastAlert, setLastAlert] = useState<SecurityAlert | null>(null);

  useEffect(() => {
    // Sistema básico de alertas (pode ser conectado ao Supabase realtime depois)
    // Por enquanto, apenas configura o hook para uso futuro
    
    // Limpar quando componente for desmontado
    return () => {};
  }, [toast]);

  // ===== UTILITÁRIOS =====
  const getAlertTitle = (severity: string): string => {
    switch (severity) {
      case 'critical': return '🚨 Alerta Crítico';
      case 'error': return '⚠️ Alerta de Erro';
      case 'warning': return '⚠️ Aviso de Segurança';
      default: return '📋 Notificação';
    }
  };

  const getToastVariant = (severity: string): "default" | "destructive" => {
    return severity === 'critical' || severity === 'error' ? 'destructive' : 'default';
  };

  // ===== AÇÕES =====
  const clearAlerts = () => {
    setAlerts([]);
    setAlertCount(0);
    setLastAlert(null);
  };

  const dismissAlert = (index: number) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const getAlertsByType = (type: SecurityAlert['type']) => {
    return alerts.filter(alert => alert.type === type);
  };

  const getAlertsBySeverity = (severity: SecurityAlert['severity']) => {
    return alerts.filter(alert => alert.severity === severity);
  };

  const getCriticalAlerts = () => {
    return getAlertsBySeverity('critical');
  };

  // ===== ESTATÍSTICAS =====
  const getStats = () => {
    const criticalCount = getCriticalAlerts().length;
    const errorCount = getAlertsBySeverity('error').length;
    const warningCount = getAlertsBySeverity('warning').length;

    return {
      total: alerts.length,
      critical: criticalCount,
      error: errorCount,
      warning: warningCount,
      hasCritical: criticalCount > 0,
      hasUnread: alertCount > 0
    };
  };

  return {
    // Estado
    alerts,
    alertCount,
    lastAlert,
    
    // Ações
    clearAlerts,
    dismissAlert,
    
    // Filtros
    getAlertsByType,
    getAlertsBySeverity,
    getCriticalAlerts,
    
    // Estatísticas
    stats: getStats(),
    
    // Utilitários
    hasNewAlerts: alertCount > 0,
    hasCriticalAlerts: getCriticalAlerts().length > 0
  };
};