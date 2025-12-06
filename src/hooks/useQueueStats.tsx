import { useState, useEffect } from 'react';
import { getQueueStats } from '@/utils/queueManager';
import type { QueueStats } from '@/utils/queueManager';

export const useQueueStats = (refreshInterval: number = 5000) => {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const stats = await getQueueStats();
      setQueueStats(stats);
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas da fila:', err);
      setError(err.message || 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Buscar estatísticas iniciais
    fetchStats();

    // Configurar polling
    const interval = setInterval(fetchStats, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    queueStats,
    isLoading,
    error,
    refetch: fetchStats
  };
};