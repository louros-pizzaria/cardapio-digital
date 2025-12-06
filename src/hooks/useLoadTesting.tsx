import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { toast } from 'sonner';

interface LoadTestConfig {
  concurrentUsers: number;
  ordersPerUser: number;
  rampUpTime: number;
  testDuration: number;
}

interface LoadTestResult {
  config: LoadTestConfig;
  duration: number;
  overall: {
    success: boolean;
    successRate: number;
    averageResponseTime: number;
    throughput: number;
    errors: number;
    totalRequests: number;
  };
  statusDistribution: Record<string, number>;
  detailed: Array<{
    userId: string;
    orderIndex: number;
    status: 'success' | 'failed' | 'timeout';
    responseTime: number;
    error?: string;
    timestamp: number;
  }>;
}

interface CurrentStats {
  activeUsers: number;
  ordersPerMinute: number;
  successRate: number;
  totalSuccess: number;
  totalAttempts: number;
}

export const useLoadTesting = () => {
  const { user } = useUnifiedAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<LoadTestResult[]>([]);
  const [currentStats, setCurrentStats] = useState<CurrentStats>({
    activeUsers: 0,
    ordersPerMinute: 0,
    successRate: 0,
    totalSuccess: 0,
    totalAttempts: 0
  });

  const testAbortController = useRef<AbortController | null>(null);
  const testStartTime = useRef<number>(0);

  // Simular um pedido individual
  const simulateOrder = async (
    userId: string, 
    orderIndex: number,
    signal: AbortSignal
  ): Promise<{
    status: 'success' | 'failed' | 'timeout';
    responseTime: number;
    error?: string;
  }> => {
    const startTime = Date.now();
    
    try {
      // Verificar se o teste foi cancelado
      if (signal.aborted) {
        throw new Error('Test aborted');
      }

      // Simular dados de pedido realísticos
      const orderData = {
        items: [
          {
            id: 'pizza-margherita',
            name: 'Pizza Margherita',
            price: 25.90,
            quantity: Math.floor(Math.random() * 3) + 1
          }
        ],
        delivery_address: {
          street: 'Rua Teste',
          number: '123',
          city: 'São Paulo',
          zip_code: '01234-567'
        },
        payment_method: 'pix',
        total: 25.90
      };

      // Tentar criar o pedido usando a fila
      const { data, error } = await supabase.rpc('enqueue_order_processing', {
        p_user_id: userId,
        p_order_data: orderData,
        p_priority: 5,
        p_idempotency_key: `load-test-${userId}-${orderIndex}-${Date.now()}`
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'failed',
          responseTime,
          error: error.message
        };
      }

      const result = data?.[0];
      if (result?.success) {
        return {
          status: 'success',
          responseTime
        };
      } else {
        return {
          status: 'failed',
          responseTime,
          error: result?.message || 'Unknown error'
        };
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.message === 'Test aborted') {
        return {
          status: 'timeout',
          responseTime,
          error: 'Test aborted'
        };
      }

      return {
        status: 'failed',
        responseTime,
        error: error.message
      };
    }
  };

  // Simular um usuário fazendo múltiplos pedidos
  const simulateUser = async (
    userIndex: number,
    config: LoadTestConfig,
    signal: AbortSignal,
    onUpdate: (result: any) => void
  ) => {
    const userId = `load-test-user-${userIndex}`;
    const results = [];

    for (let orderIndex = 0; orderIndex < config.ordersPerUser; orderIndex++) {
      if (signal.aborted) break;

      const result = await simulateOrder(userId, orderIndex, signal);
      
      const detailedResult = {
        userId,
        orderIndex,
        ...result,
        timestamp: Date.now()
      };

      results.push(detailedResult);
      onUpdate(detailedResult);

      // Delay aleatório entre pedidos (0.5-2s)
      if (orderIndex < config.ordersPerUser - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 1500 + 500)
        );
      }
    }

    return results;
  };

  const startLoadTest = useCallback(async (config: LoadTestConfig) => {
    if (!user) {
      toast.error('Você precisa estar logado para executar testes');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    testStartTime.current = Date.now();
    testAbortController.current = new AbortController();

    const allResults: any[] = [];
    const statusCount: Record<string, number> = {};
    let completedUsers = 0;

    // Função para atualizar estatísticas em tempo real
    const updateStats = () => {
      const totalAttempts = allResults.length;
      const totalSuccess = allResults.filter(r => r.status === 'success').length;
      const successRate = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;
      
      // Calcular pedidos por minuto dos últimos 60 segundos
      const oneMinuteAgo = Date.now() - 60000;
      const recentOrders = allResults.filter(r => r.timestamp > oneMinuteAgo);
      const ordersPerMinute = recentOrders.length;

      setCurrentStats({
        activeUsers: completedUsers,
        ordersPerMinute,
        successRate,
        totalSuccess,
        totalAttempts
      });
    };

    try {
      toast.info(`Iniciando teste com ${config.concurrentUsers} usuários simultâneos`);

      // Calcular delay de ramp-up entre usuários
      const rampUpDelay = (config.rampUpTime * 1000) / config.concurrentUsers;

      // Criar promises para todos os usuários
      const userPromises: Promise<any>[] = [];

      for (let userIndex = 0; userIndex < config.concurrentUsers; userIndex++) {
        const userPromise = new Promise(async (resolve) => {
          // Delay de ramp-up
          await new Promise(r => setTimeout(r, userIndex * rampUpDelay));
          
          if (testAbortController.current?.signal.aborted) {
            resolve([]);
            return;
          }

          const userResults = await simulateUser(
            userIndex,
            config,
            testAbortController.current!.signal,
            (result) => {
              allResults.push(result);
              statusCount[result.status] = (statusCount[result.status] || 0) + 1;
              updateStats();
            }
          );

          completedUsers++;
          const progressValue = (completedUsers / config.concurrentUsers) * 100;
          setProgress(progressValue);

          resolve(userResults);
        });

        userPromises.push(userPromise);
      }

      // Aguardar todos os usuários terminarem ou timeout
      const timeoutPromise = new Promise(resolve => 
        setTimeout(resolve, config.testDuration * 1000)
      );

      await Promise.race([
        Promise.all(userPromises),
        timeoutPromise
      ]);

    } catch (error: any) {
      console.error('Erro durante teste de carga:', error);
      toast.error(`Erro no teste: ${error.message}`);
    } finally {
      // Calcular resultados finais
      const testDuration = (Date.now() - testStartTime.current) / 1000;
      const totalRequests = allResults.length;
      const successfulRequests = allResults.filter(r => r.status === 'success').length;
      const averageResponseTime = totalRequests > 0 
        ? Math.round(allResults.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests)
        : 0;

      const testResult: LoadTestResult = {
        config,
        duration: Math.round(testDuration),
        overall: {
          success: successfulRequests > totalRequests * 0.95, // 95% success rate
          successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
          averageResponseTime,
          throughput: totalRequests > 0 ? Math.round(totalRequests / testDuration) : 0,
          errors: totalRequests - successfulRequests,
          totalRequests
        },
        statusDistribution: statusCount,
        detailed: allResults
      };

      setResults(prev => [testResult, ...prev]);
      setIsRunning(false);
      setProgress(100);

      // Reset current stats
      setCurrentStats({
        activeUsers: 0,
        ordersPerMinute: 0,
        successRate: testResult.overall.successRate,
        totalSuccess: successfulRequests,
        totalAttempts: totalRequests
      });

      toast.success(
        `Teste concluído! ${successfulRequests}/${totalRequests} pedidos bem-sucedidos (${testResult.overall.successRate}%)`
      );
    }
  }, [user]);

  const stopLoadTest = useCallback(() => {
    if (testAbortController.current) {
      testAbortController.current.abort();
      setIsRunning(false);
      toast.info('Teste de carga interrompido');
    }
  }, []);

  const resetResults = useCallback(() => {
    setResults([]);
    setProgress(0);
    setCurrentStats({
      activeUsers: 0,
      ordersPerMinute: 0,
      successRate: 0,
      totalSuccess: 0,
      totalAttempts: 0
    });
    toast.info('Resultados limpos');
  }, []);

  return {
    isRunning,
    progress,
    results,
    currentStats,
    startLoadTest,
    stopLoadTest,
    resetResults
  };
};