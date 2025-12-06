// ===== HOOK PARA IMPRESSÃO TÉRMICA AVANÇADO =====

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useThermalPrinterConfig } from './useThermalPrinterConfig';
import { PrintQueueItem, PrintError, PrintErrorType, PrintResponse } from '@/types/thermalPrint';

interface PrintOptions {
  copies?: number;
  printerIP?: string;
}

export const useThermalPrint = () => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastPrintResult, setLastPrintResult] = useState<PrintResponse | null>(null);
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintQueueItem[]>([]);
  const { config, addTestResult } = useThermalPrinterConfig();

  // Adicionar item à fila
  const addToQueue = useCallback((orderId: string): string => {
    const queueItem: PrintQueueItem = {
      id: `print-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      timestamp: new Date(),
    };

    setPrintQueue(prev => [...prev, queueItem]);
    return queueItem.id;
  }, []);

  // Remover item da fila
  const removeFromQueue = useCallback((queueId: string) => {
    setPrintQueue(prev => prev.filter(item => item.id !== queueId));
  }, []);

  // Mover para histórico
  const moveToHistory = useCallback((item: PrintQueueItem) => {
    setPrintHistory(prev => [item, ...prev].slice(0, 10)); // Mantém apenas últimas 10
  }, []);

  // Processar erro e determinar tipo
  const parseError = useCallback((error: any): PrintError => {
    const errorMessage = error.message || 'Erro desconhecido';
    
    let errorType: PrintErrorType = PrintErrorType.UNKNOWN;
    let suggestedAction = 'Tente novamente ou contate o suporte';
    let retryable = true;

    if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      errorType = PrintErrorType.TIMEOUT;
      suggestedAction = 'Verifique a conexão de rede e tente novamente';
    } else if (errorMessage.includes('offline') || errorMessage.includes('não responde')) {
      errorType = PrintErrorType.PRINTER_OFFLINE;
      suggestedAction = 'Verifique se a impressora está ligada e conectada';
    } else if (errorMessage.includes('busy')) {
      errorType = PrintErrorType.PRINTER_BUSY;
      suggestedAction = 'Aguarde a impressora ficar disponível';
    } else if (errorMessage.includes('paper')) {
      errorType = PrintErrorType.PAPER_OUT;
      suggestedAction = 'Recarregue o papel da impressora';
      retryable = false;
    } else if (errorMessage.includes('invalid') || errorMessage.includes('não encontrado')) {
      errorType = PrintErrorType.INVALID_DATA;
      suggestedAction = 'Verifique os dados do pedido';
      retryable = false;
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = PrintErrorType.NETWORK_ERROR;
      suggestedAction = 'Verifique sua conexão com a internet';
    }

    return {
      type: errorType,
      message: errorMessage,
      details: error,
      retryable,
      suggestedAction,
    };
  }, []);

  // Função principal de impressão com fila e retry
  const printOrder = useCallback(async (orderId: string, options: PrintOptions = {}) => {
    // Verificar se impressora está habilitada
    if (!config.enabled) {
      toast.error('Sistema de impressão desabilitado', {
        description: 'Ative nas configurações da impressora'
      });
      return;
    }

    // Adicionar à fila
    const queueId = addToQueue(orderId);

    const executePrint = async (queueItem: PrintQueueItem): Promise<boolean> => {
      // Atualizar status para printing
      setPrintQueue(prev => prev.map(item =>
        item.id === queueId ? { ...item, status: 'printing', lastAttemptAt: new Date() } : item
      ));

      try {
        console.log('[THERMAL-PRINT] 🖨️ Iniciando impressão do pedido:', orderId);
        
        // Usar configurações salvas se não especificado
        const printerIP = options.printerIP || 
          (config.connectionType === 'network' ? config.printerIP : undefined);
        
        // Timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          // Chamar Edge Function de impressão
          const { data, error } = await supabase.functions.invoke('print-thermal', {
            body: {
              orderId,
              printerIP,
              copies: options.copies || 1
            }
          });

          clearTimeout(timeoutId);

          if (error) {
            throw new Error(error.message);
          }

          const result = data as PrintResponse;
          setLastPrintResult(result);

          if (result.success) {
            // Sucesso - atualizar queue item
            const completedItem: PrintQueueItem = {
              ...queueItem,
              status: 'completed',
              attempts: queueItem.attempts + 1,
            };
            
            setPrintQueue(prev => prev.filter(item => item.id !== queueId));
            moveToHistory(completedItem);
            
            toast.success(result.message, {
              description: `Pedido #${orderId.slice(-6).toUpperCase()}`,
              duration: 3000
            });
            
            console.log('[THERMAL-PRINT] ✅ Impressão concluída:', result);
            return true;
          } else {
            throw new Error(result.error_message || result.message || 'Falha na impressão');
          }
        } catch (error: any) {
          clearTimeout(timeoutId);
          
          if (error.name === 'AbortError') {
            throw new Error('Timeout: A impressora não respondeu em 10 segundos');
          }
          throw error;
        }

      } catch (error: any) {
        console.error('[THERMAL-PRINT] ❌ Erro na impressão:', error);
        
        const printError = parseError(error);
        const newAttempts = queueItem.attempts + 1;

        // Verificar se deve fazer retry
        if (printError.retryable && newAttempts < queueItem.maxAttempts) {
          // Fazer retry com backoff exponencial
          const delay = Math.min(1000 * Math.pow(2, newAttempts - 1), 8000);
          
          setPrintQueue(prev => prev.map(item =>
            item.id === queueId
              ? { ...item, status: 'pending', attempts: newAttempts, error: printError }
              : item
          ));
          
          toast.warning(`Tentando novamente em ${delay / 1000}s...`, {
            description: `Tentativa ${newAttempts} de ${queueItem.maxAttempts}`,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Buscar item atualizado e tentar novamente
          const updatedItem = printQueue.find(item => item.id === queueId);
          if (updatedItem) {
            return executePrint(updatedItem);
          }
        } else {
          // Falhou permanentemente
          const failedItem: PrintQueueItem = {
            ...queueItem,
            status: 'failed',
            attempts: newAttempts,
            error: printError,
          };
          
          setPrintQueue(prev => prev.filter(item => item.id !== queueId));
          moveToHistory(failedItem);
          
          toast.error('Erro na impressão', {
            description: printError.suggestedAction,
            duration: 5000
          });
        }
        
        return false;
      }
    };

    // Iniciar processamento
    const queueItem = printQueue.find(item => item.id === queueId);
    if (queueItem) {
      setIsPrinting(true);
      try {
        await executePrint(queueItem);
      } finally {
        setIsPrinting(false);
      }
    }
  }, [config, addToQueue, parseError, moveToHistory, printQueue]);

  const printOrderCopies = async (orderId: string, copies: number, printerIP?: string) => {
    return printOrder(orderId, { copies, printerIP });
  };

  const testPrinter = async (printerIP?: string) => {
    setIsPrinting(true);
    
    try {
      console.log('[THERMAL-PRINT] 🧪 Testando impressora...');
      
      // Usar configuração salva se não especificado
      const targetIP = printerIP || 
        (config.connectionType === 'network' ? config.printerIP : undefined);
      
      const testOrderId = 'test-' + Date.now();
      
      // Criar pedido de teste temporário para impressão
      const testOrder = {
        id: testOrderId,
        customer_name: 'TESTE DE IMPRESSORA',
        customer_phone: '(11) 99999-9999',
        total_amount: 25.50,
        delivery_fee: 5.00,
        payment_method: 'dinheiro',
        created_at: new Date().toISOString(),
        status: 'test',
        items: [{
          quantity: 1,
          name: 'Teste de Impressão',
          unit_price: 20.50,
          total_price: 20.50
        }]
      };

      const { data, error } = await supabase.functions.invoke('print-thermal', {
        body: {
          orderId: testOrderId,
          printerIP: targetIP,
          copies: 1,
          testMode: true,
          testOrder
        }
      });

      if (error) throw new Error(error.message);

      const result = data as PrintResponse;
      
      if (result.success) {
        toast.success('Teste de impressão enviado!', {
          description: 'Verifique se a comanda foi impressa',
          duration: 3000
        });
        
        // Salvar resultado positivo
        addTestResult({
          success: true,
          message: result.message
        });
      } else {
        // Salvar resultado de falha
        addTestResult({
          success: false,
          message: result.message
        });
        throw new Error(result.message);
      }

      return result;

    } catch (error: any) {
      console.error('[THERMAL-PRINT] ❌ Erro no teste:', error);
      
      // Salvar resultado de erro
      addTestResult({
        success: false,
        message: error.message || 'Erro desconhecido'
      });
      
      toast.error('Erro no teste de impressão', {
        description: error.message
      });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  // Retry de item falhado
  const retryPrint = useCallback(async (queueId: string) => {
    const item = printHistory.find(i => i.id === queueId);
    if (item && item.status === 'failed') {
      // Readicionar à fila
      const newItem: PrintQueueItem = {
        ...item,
        id: `retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        attempts: 0,
        error: undefined,
        timestamp: new Date(),
      };
      
      setPrintQueue(prev => [...prev, newItem]);
      toast.info('Reimpressão adicionada à fila');
    }
  }, [printHistory]);

  // Limpar fila
  const clearQueue = useCallback(() => {
    const hasActivePrints = printQueue.some(item => item.status === 'printing');
    
    if (hasActivePrints) {
      toast.warning('Aguarde as impressões em andamento');
      return;
    }
    
    setPrintQueue([]);
    toast.success('Fila de impressão limpa');
  }, [printQueue]);

  // Função para obter preview do pedido
  const getOrderPreview = async (orderId: string) => {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            total_price,
            notes,
            products (name)
          ),
          addresses (
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zip_code
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!order) throw new Error('Pedido não encontrado');

      return {
        ...order,
        order_number: order.order_number || order.id.slice(0, 8),
        customer_phone: order.customer_phone || 'Não informado',
        delivery_address: order.addresses,
        items: order.order_items?.map((item: any) => ({
          product_name: item.products?.name || 'Produto',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes
        })) || [],
        subtotal: order.total_amount - (order.delivery_fee || 0)
      };
    } catch (error) {
      console.error('Erro ao buscar pedido para preview:', error);
      throw error;
    }
  };

  return {
    printOrder,
    printOrderCopies,
    testPrinter,
    getOrderPreview,
    isPrinting,
    lastPrintResult,
    printQueue,
    printHistory,
    retryPrint,
    clearQueue,
  };
};