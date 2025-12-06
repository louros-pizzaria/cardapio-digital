// ===== GERENCIADOR DE FILAS E PROCESSAMENTO ASSÍNCRONO =====

import { supabase } from '@/integrations/supabase/client';

interface QueueItem {
  id: string;
  user_id: string;
  order_data: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error_message?: string;
  error_details?: any;
  worker_id?: string;
  order_id?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

interface BackgroundJob {
  id: string;
  job_type: string;
  job_data: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error_message?: string;
  error_details?: any;
  worker_id?: string;
  result_data?: any;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
}

interface QueueStats {
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
  failed_orders: number;
  average_processing_time: number;
  pending_jobs: number;
  processing_jobs: number;
  worker_count: number;
}

class QueueManager {
  private static instance: QueueManager;
  
  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  // Adicionar pedido à fila
  async enqueueOrder(
    userId: string,
    orderData: any,
    options: {
      priority?: number;
      idempotencyKey?: string;
      delay?: number; // segundos
    } = {}
  ): Promise<{
    success: boolean;
    queueId?: string;
    message: string;
  }> {
    try {
      const { priority = 5, idempotencyKey, delay = 0 } = options;
      
      // Calcular agendamento
      const scheduledAt = new Date(Date.now() + delay * 1000);

      const { data, error } = await supabase.rpc('enqueue_order_processing', {
        p_user_id: userId,
        p_order_data: orderData,
        p_priority: priority,
        p_idempotency_key: idempotencyKey
      });

      if (error) {
        console.error('[QUEUE_MANAGER] Erro ao enfileirar pedido:', error);
        return {
          success: false,
          message: `Erro ao adicionar pedido à fila: ${error.message}`
        };
      }

      const result = data?.[0];
      if (result?.success) {
        // Disparar processamento se não há delay
        if (delay === 0) {
          this.triggerQueueProcessing();
        }

        return {
          success: true,
          queueId: result.queue_id,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result?.message || 'Falha ao enfileirar pedido'
        };
      }
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao enfileirar pedido:', error);
      return {
        success: false,
        message: 'Erro interno ao enfileirar pedido'
      };
    }
  }

  // Disparar processamento da fila
  async triggerQueueProcessing(): Promise<void> {
    try {
      // Chamar Edge Function para processar fila
      const { data, error } = await supabase.functions.invoke('process-order-queue', {
        body: {}
      });

      if (error) {
        console.error('[QUEUE_MANAGER] Erro ao disparar processamento:', error);
      } else {
        console.log('[QUEUE_MANAGER] Processamento da fila disparado:', data);
      }
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao disparar processamento:', error);
    }
  }

  // Monitorar status de item na fila
  async getQueueItemStatus(queueId: string): Promise<QueueItem | null> {
    try {
      const { data, error } = await supabase
        .from('order_processing_queue')
        .select('*')
        .eq('id', queueId)
        .single();

      if (error) {
        console.error('[QUEUE_MANAGER] Erro ao buscar status do item:', error);
        return null;
      }

      return data as QueueItem;
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao buscar status do item:', error);
      return null;
    }
  }

  // Buscar itens da fila do usuário
  async getUserQueueItems(userId: string, limit: number = 20): Promise<QueueItem[]> {
    try {
      const { data, error } = await supabase
        .from('order_processing_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[QUEUE_MANAGER] Erro ao buscar itens do usuário:', error);
        return [];
      }

      return (data || []) as QueueItem[];
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao buscar itens do usuário:', error);
      return [];
    }
  }

  // Cancelar item da fila
  async cancelQueueItem(queueId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { error } = await supabase
        .from('order_processing_queue')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId)
        .eq('status', 'pending'); // Só pode cancelar se estiver pendente

      if (error) {
        return {
          success: false,
          message: `Erro ao cancelar item: ${error.message}`
        };
      }

      return {
        success: true,
        message: 'Item cancelado com sucesso'
      };
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao cancelar item:', error);
      return {
        success: false,
        message: 'Erro interno ao cancelar item'
      };
    }
  }

  // Adicionar job de background
  async enqueueBackgroundJob(
    jobType: string,
    jobData: any,
    options: {
      priority?: number;
      scheduledAt?: Date;
      timeoutSeconds?: number;
    } = {}
  ): Promise<{
    success: boolean;
    jobId?: string;
    message: string;
  }> {
    try {
      const { 
        priority = 5, 
        scheduledAt = new Date(),
        timeoutSeconds = 300 
      } = options;

      const { data, error } = await supabase.rpc('enqueue_background_job', {
        p_job_type: jobType,
        p_job_data: jobData,
        p_priority: priority,
        p_scheduled_at: scheduledAt.toISOString(),
        p_timeout_seconds: timeoutSeconds
      });

      if (error) {
        console.error('[QUEUE_MANAGER] Erro ao enfileirar job:', error);
        return {
          success: false,
          message: `Erro ao adicionar job à fila: ${error.message}`
        };
      }

      const result = data?.[0];
      if (result?.success) {
        // Disparar worker de background
        this.triggerBackgroundWorker(jobType);

        return {
          success: true,
          jobId: result.job_id,
          message: result.message
        };
      } else {
        return {
          success: false,
          message: result?.message || 'Falha ao enfileirar job'
        };
      }
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao enfileirar job:', error);
      return {
        success: false,
        message: 'Erro interno ao enfileirar job'
      };
    }
  }

  // Disparar worker de background
  async triggerBackgroundWorker(jobType?: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('background-worker', {
        body: { job_type: jobType }
      });

      if (error) {
        console.error('[QUEUE_MANAGER] Erro ao disparar worker:', error);
      } else {
        console.log('[QUEUE_MANAGER] Worker de background disparado:', data);
      }
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao disparar worker:', error);
    }
  }

  // Buscar jobs de background
  async getBackgroundJobs(
    jobType?: string,
    status?: string,
    limit: number = 20
  ): Promise<BackgroundJob[]> {
    try {
      let query = supabase
        .from('background_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[QUEUE_MANAGER] Erro ao buscar jobs:', error);
        return [];
      }

      return (data || []) as BackgroundJob[];
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao buscar jobs:', error);
      return [];
    }
  }

  // Obter estatísticas da fila
  async getQueueStats(): Promise<QueueStats> {
    try {
      const [queueStats, jobStats] = await Promise.all([
        this.getOrderQueueStats(),
        this.getBackgroundJobStats()
      ]);

      return {
        pending_orders: 0,
        processing_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        average_processing_time: 0,
        pending_jobs: 0,
        processing_jobs: 0,
        worker_count: 0,
        ...queueStats,
        ...jobStats
      };
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro ao buscar estatísticas:', error);
      return {
        pending_orders: 0,
        processing_orders: 0,
        completed_orders: 0,
        failed_orders: 0,
        average_processing_time: 0,
        pending_jobs: 0,
        processing_jobs: 0,
        worker_count: 0
      };
    }
  }

  private async getOrderQueueStats(): Promise<Partial<QueueStats>> {
    const { data } = await supabase
      .from('order_processing_queue')
      .select('status, started_at, completed_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

    if (!data) return {};

    const pending = data.filter(item => item.status === 'pending').length;
    const processing = data.filter(item => item.status === 'processing').length;
    const completed = data.filter(item => item.status === 'completed').length;
    const failed = data.filter(item => item.status === 'failed').length;

    // Calcular tempo médio de processamento
    const completedItems = data.filter(item => 
      item.status === 'completed' && item.started_at && item.completed_at
    );
    
    let averageTime = 0;
    if (completedItems.length > 0) {
      const totalTime = completedItems.reduce((sum, item) => {
        const start = new Date(item.started_at!).getTime();
        const end = new Date(item.completed_at!).getTime();
        return sum + (end - start);
      }, 0);
      averageTime = totalTime / completedItems.length / 1000; // Em segundos
    }

    return {
      pending_orders: pending,
      processing_orders: processing,
      completed_orders: completed,
      failed_orders: failed,
      average_processing_time: averageTime
    };
  }

  private async getBackgroundJobStats(): Promise<Partial<QueueStats>> {
    const { data } = await supabase
      .from('background_jobs')
      .select('status, worker_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

    if (!data) return {};

    const pending = data.filter(job => job.status === 'pending').length;
    const processing = data.filter(job => job.status === 'processing').length;
    const activeWorkers = new Set(
      data.filter(job => job.worker_id).map(job => job.worker_id)
    ).size;

    return {
      pending_jobs: pending,
      processing_jobs: processing,
      worker_count: activeWorkers
    };
  }

  // Limpar dados antigos
  async cleanupOldData(): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_queue_items');

      if (error) {
        return {
          success: false,
          deletedCount: 0,
          message: `Erro na limpeza: ${error.message}`
        };
      }

      return {
        success: true,
        deletedCount: data || 0,
        message: `${data || 0} itens removidos com sucesso`
      };
    } catch (error) {
      console.error('[QUEUE_MANAGER] Erro na limpeza:', error);
      return {
        success: false,
        deletedCount: 0,
        message: 'Erro interno na limpeza'
      };
    }
  }
}

// Instância global
export const queueManager = QueueManager.getInstance();

// Funções de conveniência
export const enqueueOrder = (userId: string, orderData: any, options?: any) =>
  queueManager.enqueueOrder(userId, orderData, options);

export const triggerQueueProcessing = () =>
  queueManager.triggerQueueProcessing();

export const getQueueItemStatus = (queueId: string) =>
  queueManager.getQueueItemStatus(queueId);

export const getUserQueueItems = (userId: string, limit?: number) =>
  queueManager.getUserQueueItems(userId, limit);

export const cancelQueueItem = (queueId: string) =>
  queueManager.cancelQueueItem(queueId);

export const enqueueBackgroundJob = (jobType: string, jobData: any, options?: any) =>
  queueManager.enqueueBackgroundJob(jobType, jobData, options);

export const triggerBackgroundWorker = (jobType?: string) =>
  queueManager.triggerBackgroundWorker(jobType);

export const getBackgroundJobs = (jobType?: string, status?: string, limit?: number) =>
  queueManager.getBackgroundJobs(jobType, status, limit);

export const getQueueStats = () =>
  queueManager.getQueueStats();

export const cleanupOldQueueData = () =>
  queueManager.cleanupOldData();

export type { QueueItem, BackgroundJob, QueueStats };