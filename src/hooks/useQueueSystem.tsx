// ===== HOOK PARA SISTEMA DE FILAS =====

import { useState, useCallback, useEffect } from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { 
  queueManager,
  enqueueOrder,
  triggerQueueProcessing,
  getQueueItemStatus,
  getUserQueueItems,
  cancelQueueItem,
  enqueueBackgroundJob,
  getQueueStats,
  type QueueItem,
  type BackgroundJob,
  type QueueStats
} from '@/utils/queueManager';

interface UseQueueSystemReturn {
  // Estado
  isLoading: boolean;
  error: string | null;
  userQueueItems: QueueItem[];
  queueStats: QueueStats;
  lastQueuedOrderId: string | null;

  // Ações para pedidos
  enqueueOrder: (orderData: any, options?: {
    priority?: number;
    idempotencyKey?: string;
    delay?: number;
  }) => Promise<{
    success: boolean;
    queueId?: string;
    message: string;
  }>;

  triggerProcessing: () => Promise<void>;
  getItemStatus: (queueId: string) => Promise<QueueItem | null>;
  cancelItem: (queueId: string) => Promise<{ success: boolean; message: string }>;

  // Ações para background jobs
  scheduleJob: (jobType: string, jobData: any, options?: {
    priority?: number;
    scheduledAt?: Date;
    timeoutSeconds?: number;
  }) => Promise<{
    success: boolean;
    jobId?: string;
    message: string;
  }>;

  // Monitoramento
  loadUserQueue: () => Promise<void>;
  loadQueueStats: () => Promise<void>;
  startRealTimeMonitoring: () => void;
  stopRealTimeMonitoring: () => void;

  // Utilitários
  getOrderByQueueId: (queueId: string) => string | null;
  isOrderProcessing: (queueId: string) => boolean;
  getEstimatedWaitTime: () => number; // em segundos
  clearError: () => void;
}

export const useQueueSystem = (): UseQueueSystemReturn => {
  const { user } = useUnifiedAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userQueueItems, setUserQueueItems] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending_orders: 0,
    processing_orders: 0,
    completed_orders: 0,
    failed_orders: 0,
    average_processing_time: 0,
    pending_jobs: 0,
    processing_jobs: 0,
    worker_count: 0
  });
  const [lastQueuedOrderId, setLastQueuedOrderId] = useState<string | null>(null);
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  // Enfileirar pedido
  const handleEnqueueOrder = useCallback(async (
    orderData: any, 
    options: {
      priority?: number;
      idempotencyKey?: string;
      delay?: number;
    } = {}
  ) => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return { success: false, message: 'Usuário não autenticado' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await enqueueOrder(user.id, orderData, options);
      
      if (result.success) {
        setLastQueuedOrderId(result.queueId || null);
        
        // Atualizar lista de itens do usuário
        await loadUserQueue();
        
        // Atualizar estatísticas
        await loadQueueStats();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enfileirar pedido';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Disparar processamento
  const triggerProcessing = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await triggerQueueProcessing();
      
      // Atualizar dados após processamento
      setTimeout(async () => {
        await loadUserQueue();
        await loadQueueStats();
      }, 2000); // Aguardar 2 segundos para processar
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao disparar processamento';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Buscar status de item específico
  const getItemStatus = useCallback(async (queueId: string) => {
    try {
      return await getQueueItemStatus(queueId);
    } catch (err) {
      console.error('Erro ao buscar status do item:', err);
      return null;
    }
  }, []);

  // Cancelar item da fila
  const cancelItem = useCallback(async (queueId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await cancelQueueItem(queueId);
      
      if (result.success) {
        // Atualizar lista de itens
        await loadUserQueue();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cancelar item';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Agendar job de background
  const scheduleJob = useCallback(async (
    jobType: string,
    jobData: any,
    options: {
      priority?: number;
      scheduledAt?: Date;
      timeoutSeconds?: number;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await enqueueBackgroundJob(jobType, jobData, options);
      
      if (result.success) {
        // Atualizar estatísticas
        await loadQueueStats();
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao agendar job';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar itens da fila do usuário
  const loadUserQueue = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const items = await getUserQueueItems(user.id, 50);
      setUserQueueItems(items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar fila do usuário';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Carregar estatísticas da fila
  const loadQueueStats = useCallback(async () => {
    try {
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch (err) {
      console.error('Erro ao carregar estatísticas da fila:', err);
    }
  }, []);

  // Iniciar monitoramento em tempo real
  const startRealTimeMonitoring = useCallback(() => {
    if (monitoringInterval) return; // Já está monitorando

    const interval = setInterval(async () => {
      await Promise.all([
        loadUserQueue(),
        loadQueueStats()
      ]);
    }, 5000); // Atualizar a cada 5 segundos

    setMonitoringInterval(interval);
  }, [monitoringInterval, loadUserQueue, loadQueueStats]);

  // Parar monitoramento em tempo real
  const stopRealTimeMonitoring = useCallback(() => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  }, [monitoringInterval]);

  // Utilitários
  const getOrderByQueueId = useCallback((queueId: string): string | null => {
    const item = userQueueItems.find(item => item.id === queueId);
    return item?.order_id || null;
  }, [userQueueItems]);

  const isOrderProcessing = useCallback((queueId: string): boolean => {
    const item = userQueueItems.find(item => item.id === queueId);
    return item?.status === 'processing';
  }, [userQueueItems]);

  const getEstimatedWaitTime = useCallback((): number => {
    const { pending_orders, processing_orders, average_processing_time } = queueStats;
    
    if (average_processing_time === 0) return 0;
    
    // Estimar baseado na fila e tempo médio
    const estimatedTime = (pending_orders * average_processing_time) / Math.max(1, processing_orders);
    return Math.ceil(estimatedTime);
  }, [queueStats]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadUserQueue();
      loadQueueStats();
    }
  }, [user?.id, loadUserQueue, loadQueueStats]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      stopRealTimeMonitoring();
    };
  }, [stopRealTimeMonitoring]);

  return {
    // Estado
    isLoading,
    error,
    userQueueItems,
    queueStats,
    lastQueuedOrderId,

    // Ações para pedidos
    enqueueOrder: handleEnqueueOrder,
    triggerProcessing,
    getItemStatus,
    cancelItem,

    // Ações para background jobs
    scheduleJob,

    // Monitoramento
    loadUserQueue,
    loadQueueStats,
    startRealTimeMonitoring,
    stopRealTimeMonitoring,

    // Utilitários
    getOrderByQueueId,
    isOrderProcessing,
    getEstimatedWaitTime,
    clearError
  };
};