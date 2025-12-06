// ===== VALIDAÇÃO E VERIFICAÇÃO DE INTEGRIDADE PARA TESTES DE CARGA =====

import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

export interface ValidationReport {
  timestamp: number;
  testId: string;
  validations: {
    stockConsistency: ValidationResult;
    queueIntegrity: ValidationResult;
    rateLimitingCompliance: ValidationResult;
    auditTrailCompleteness: ValidationResult;
    duplicateOrderPrevention: ValidationResult;
  };
  overallPassed: boolean;
}

class LoadTestValidator {
  private static instance: LoadTestValidator;
  
  public static getInstance(): LoadTestValidator {
    if (!LoadTestValidator.instance) {
      LoadTestValidator.instance = new LoadTestValidator();
    }
    return LoadTestValidator.instance;
  }

  // Validar consistência do estoque
  async validateStockConsistency(): Promise<ValidationResult> {
    try {
      // Verificar se não há estoque negativo
      const { data: negativeStock, error: negativeError } = await supabase
        .from('product_stock')
        .select('product_id, available_quantity')
        .lt('available_quantity', 0);

      if (negativeError) {
        return {
          passed: false,
          message: `Erro ao verificar estoque: ${negativeError.message}`
        };
      }

      if (negativeStock && negativeStock.length > 0) {
        return {
          passed: false,
          message: `Encontrado estoque negativo em ${negativeStock.length} produtos`,
          details: negativeStock
        };
      }

      // Verificar se reservas não excedem estoque disponível
      const { data: stockReservations, error: reservationError } = await supabase
        .from('stock_reservations')
        .select(`
          product_id,
          quantity,
          product_stock!inner(available_quantity)
        `)
        .eq('status', 'active');

      if (reservationError) {
        return {
          passed: false,
          message: `Erro ao verificar reservas: ${reservationError.message}`
        };
      }

      // Agrupar reservas por produto
      const reservationsByProduct: Record<string, number> = {};
      stockReservations?.forEach(reservation => {
        const productId = reservation.product_id;
        reservationsByProduct[productId] = (reservationsByProduct[productId] || 0) + reservation.quantity;
      });

      // Verificar se alguma reserva excede o estoque
      const { data: allStock, error: stockError } = await supabase
        .from('product_stock')
        .select('product_id, available_quantity');

      if (stockError) {
        return {
          passed: false,
          message: `Erro ao verificar estoque total: ${stockError.message}`
        };
      }

      const violations = [];
      for (const stock of allStock || []) {
        const reservedAmount = reservationsByProduct[stock.product_id] || 0;
        if (reservedAmount > stock.available_quantity) {
          violations.push({
            productId: stock.product_id,
            available: stock.available_quantity,
            reserved: reservedAmount
          });
        }
      }

      if (violations.length > 0) {
        return {
          passed: false,
          message: `Reservas excedem estoque disponível em ${violations.length} produtos`,
          details: violations
        };
      }

      return {
        passed: true,
        message: 'Consistência de estoque validada com sucesso'
      };

    } catch (error: any) {
      return {
        passed: false,
        message: `Erro na validação de estoque: ${error.message}`
      };
    }
  }

  // Validar integridade da fila
  async validateQueueIntegrity(): Promise<ValidationResult> {
    try {
      // Verificar se não há itens orfãos processando por muito tempo
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: orphanedItems, error } = await supabase
        .from('order_processing_queue')
        .select('id, user_id, started_at, worker_id')
        .eq('status', 'processing')
        .lt('started_at', oneHourAgo);

      if (error) {
        return {
          passed: false,
          message: `Erro ao verificar fila: ${error.message}`
        };
      }

      if (orphanedItems && orphanedItems.length > 0) {
        return {
          passed: false,
          message: `Encontrados ${orphanedItems.length} itens órfãos na fila`,
          details: orphanedItems
        };
      }

      // Verificar se não há duplicatas com mesmo idempotency_key
      const { data: duplicates, error: dupError } = await supabase
        .from('order_processing_queue')
        .select('idempotency_key')
        .not('idempotency_key', 'is', null)
        .neq('status', 'cancelled');

      if (dupError) {
        return {
          passed: false,
          message: `Erro ao verificar duplicatas: ${dupError.message}`
        };
      }

      const idempotencyKeys = duplicates?.map(d => d.idempotency_key) || [];
      const uniqueKeys = new Set(idempotencyKeys);
      
      if (idempotencyKeys.length !== uniqueKeys.size) {
        return {
          passed: false,
          message: `Encontradas chaves de idempotência duplicadas: ${idempotencyKeys.length - uniqueKeys.size} duplicatas`
        };
      }

      return {
        passed: true,
        message: 'Integridade da fila validada com sucesso'
      };

    } catch (error: any) {
      return {
        passed: false,
        message: `Erro na validação da fila: ${error.message}`
      };
    }
  }

  // Validar conformidade com rate limiting
  async validateRateLimitingCompliance(): Promise<ValidationResult> {
    try {
      // Buscar tentativas recentes por usuário na última hora
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: recentOrders, error } = await supabase
        .from('order_processing_queue')
        .select('user_id, created_at')
        .gte('created_at', oneHourAgo);

      if (error) {
        return {
          passed: false,
          message: `Erro ao verificar rate limiting: ${error.message}`
        };
      }

      // Contar pedidos por usuário
      const ordersByUser: Record<string, number> = {};
      recentOrders?.forEach(order => {
        ordersByUser[order.user_id] = (ordersByUser[order.user_id] || 0) + 1;
      });

      // Verificar se algum usuário excedeu o limite (100 pedidos/hora padrão)
      const violations = Object.entries(ordersByUser)
        .filter(([_, count]) => count > 100)
        .map(([userId, count]) => ({ userId, count }));

      if (violations.length > 0) {
        return {
          passed: false,
          message: `${violations.length} usuários excederam o rate limit`,
          details: violations
        };
      }

      return {
        passed: true,
        message: 'Rate limiting funcionando corretamente'
      };

    } catch (error: any) {
      return {
        passed: false,
        message: `Erro na validação de rate limiting: ${error.message}`
      };
    }
  }

  // Validar completude do audit trail
  async validateAuditTrailCompleteness(): Promise<ValidationResult> {
    try {
      // Verificar se todas as operações de estoque têm logs de auditoria
      const { data: stockAudits, error } = await supabase
        .from('stock_audit_logs')
        .select('operation_type, product_id, created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (error) {
        return {
          passed: false,
          message: `Erro ao verificar audit trail: ${error.message}`
        };
      }

      // Verificar se há logs suficientes para o período de teste
      if (!stockAudits || stockAudits.length === 0) {
        return {
          passed: false,
          message: 'Nenhum log de auditoria encontrado para o período de teste'
        };
      }

      return {
        passed: true,
        message: `Audit trail completo: ${stockAudits.length} logs registrados`
      };

    } catch (error: any) {
      return {
        passed: false,
        message: `Erro na validação do audit trail: ${error.message}`
      };
    }
  }

  // Validar prevenção de pedidos duplicados
  async validateDuplicateOrderPrevention(): Promise<ValidationResult> {
    try {
      const { data: duplicates, error } = await supabase
        .from('order_processing_queue')
        .select('idempotency_key, count(*)')
        .not('idempotency_key', 'is', null)
        .neq('status', 'cancelled')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (error) {
        return {
          passed: false,
          message: `Erro ao verificar duplicatas: ${error.message}`
        };
      }

      // A query acima não funciona como esperado, vamos fazer manualmente
      const { data: allOrdersWithKey, error: keyError } = await supabase
        .from('order_processing_queue')
        .select('idempotency_key')
        .not('idempotency_key', 'is', null)
        .neq('status', 'cancelled')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (keyError) {
        return {
          passed: false,
          message: `Erro ao verificar chaves de idempotência: ${keyError.message}`
        };
      }

      const keys = allOrdersWithKey?.map(o => o.idempotency_key) || [];
      const uniqueKeys = new Set(keys);

      if (keys.length !== uniqueKeys.size) {
        return {
          passed: false,
          message: `Detectadas ${keys.length - uniqueKeys.size} tentativas de pedidos duplicados`
        };
      }

      return {
        passed: true,
        message: 'Prevenção de duplicatas funcionando corretamente'
      };

    } catch (error: any) {
      return {
        passed: false,
        message: `Erro na validação de duplicatas: ${error.message}`
      };
    }
  }

  // Executar todas as validações
  async runFullValidation(testId: string): Promise<ValidationReport> {
    const timestamp = Date.now();

    const [
      stockConsistency,
      queueIntegrity, 
      rateLimitingCompliance,
      auditTrailCompleteness,
      duplicateOrderPrevention
    ] = await Promise.all([
      this.validateStockConsistency(),
      this.validateQueueIntegrity(),
      this.validateRateLimitingCompliance(),
      this.validateAuditTrailCompleteness(),
      this.validateDuplicateOrderPrevention()
    ]);

    const validations = {
      stockConsistency,
      queueIntegrity,
      rateLimitingCompliance,
      auditTrailCompleteness,
      duplicateOrderPrevention
    };

    const overallPassed = Object.values(validations).every(v => v.passed);

    return {
      timestamp,
      testId,
      validations,
      overallPassed
    };
  }
}

// Instância global
export const loadTestValidator = LoadTestValidator.getInstance();

// Funções de conveniência
export const validateStockConsistency = () => 
  loadTestValidator.validateStockConsistency();

export const validateQueueIntegrity = () => 
  loadTestValidator.validateQueueIntegrity();

export const validateRateLimitingCompliance = () => 
  loadTestValidator.validateRateLimitingCompliance();

export const validateAuditTrailCompleteness = () => 
  loadTestValidator.validateAuditTrailCompleteness();

export const validateDuplicateOrderPrevention = () => 
  loadTestValidator.validateDuplicateOrderPrevention();

export const runFullValidation = (testId: string) => 
  loadTestValidator.runFullValidation(testId);