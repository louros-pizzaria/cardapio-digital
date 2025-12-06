import { useEffect, useRef, useCallback } from 'react';
import { useThermalPrint } from './useThermalPrint';
import { useThermalPrinterConfig } from './useThermalPrinterConfig';
import { toast } from 'sonner';

interface AutoPrintOrder {
  id: string;
  status: string;
  customer_name: string;
}

interface AutoPrintLog {
  timestamp: string;
  action: string;
  data: any;
  enabled: boolean;
}

export const useAutoPrint = () => {
  const { printOrder } = useThermalPrint();
  const { config } = useThermalPrinterConfig();
  const printedOrdersRef = useRef<Set<string>>(new Set());

  // Limpar cache de pedidos impressos a cada 1 hora
  useEffect(() => {
    const interval = setInterval(() => {
      printedOrdersRef.current.clear();
      console.log('[AUTO-PRINT] Cache de impressões limpo');
    }, 60 * 60 * 1000); // 1 hora

    return () => clearInterval(interval);
  }, []);

  const logAutoPrint = useCallback((action: string, data: any) => {
    const log: AutoPrintLog = {
      timestamp: new Date().toISOString(),
      action,
      data,
      enabled: config.enabled,
    };
    
    console.log('[AUTO-PRINT]', log);
    
    // Salvar últimos 50 logs no localStorage para debug
    try {
      const logs = JSON.parse(localStorage.getItem('auto-print-logs') || '[]');
      logs.unshift(log);
      localStorage.setItem('auto-print-logs', JSON.stringify(logs.slice(0, 50)));
    } catch (error) {
      console.error('[AUTO-PRINT] Erro ao salvar log:', error);
    }
  }, [config.enabled]);

  const tryAutoPrint = useCallback(async (order: AutoPrintOrder) => {
    // Verificar se impressão automática está habilitada
    if (!config.enabled) {
      logAutoPrint('skipped_disabled', { orderId: order.id });
      return;
    }

    // Verificar se pedido já foi impresso (evitar duplicatas)
    if (printedOrdersRef.current.has(order.id)) {
      logAutoPrint('skipped_duplicate', { orderId: order.id });
      return;
    }

    // Verificar se pedido está confirmado
    if (order.status !== 'confirmed') {
      logAutoPrint('skipped_not_confirmed', { orderId: order.id, status: order.status });
      return;
    }

    try {
      logAutoPrint('printing', { orderId: order.id, customer: order.customer_name });
      
      await printOrder(order.id);
      
      // Marcar como impresso
      printedOrdersRef.current.add(order.id);
      
      toast.success(`Comanda impressa automaticamente`, {
        description: `Pedido de ${order.customer_name}`,
        duration: 3000,
      });

      logAutoPrint('success', { orderId: order.id });
    } catch (error) {
      logAutoPrint('error', { orderId: order.id, error: String(error) });
      
      toast.error('Erro ao imprimir comanda automaticamente', {
        description: 'Verifique a impressora e tente novamente',
        action: {
          label: 'Reimprimir',
          onClick: () => printOrder(order.id),
        },
      });
    }
  }, [config.enabled, printOrder, logAutoPrint]);

  const getAutoPrintLogs = (): AutoPrintLog[] => {
    try {
      return JSON.parse(localStorage.getItem('auto-print-logs') || '[]');
    } catch {
      return [];
    }
  };

  const clearAutoPrintLogs = () => {
    localStorage.removeItem('auto-print-logs');
    logAutoPrint('logs_cleared', {});
  };

  return { 
    tryAutoPrint, 
    isEnabled: config.enabled,
    getAutoPrintLogs,
    clearAutoPrintLogs,
  };
};
