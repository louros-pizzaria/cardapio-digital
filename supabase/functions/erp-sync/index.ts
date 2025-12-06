import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ERPSyncRequest {
  erp_system: 'bling' | 'omie' | 'tiny' | 'sap' | 'custom';
  sync_type: 'products' | 'orders' | 'customers' | 'inventory' | 'all';
  direction?: 'import' | 'export' | 'bidirectional';
  date_range?: {
    start: string;
    end: string;
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ERP-SYNC] ${step}${detailsStr}`);
};

// ERP System connectors
class ERPConnector {
  constructor(private config: any) {}

  async syncProducts(direction: string = 'export') {
    switch (this.config.erp_system) {
      case 'bling':
        return this.syncBlingProducts(direction);
      case 'omie':
        return this.syncOmieProducts(direction);
      case 'tiny':
        return this.syncTinyProducts(direction);
      default:
        throw new Error(`Unsupported ERP system: ${this.config.erp_system}`);
    }
  }

  async syncOrders(direction: string = 'export') {
    switch (this.config.erp_system) {
      case 'bling':
        return this.syncBlingOrders(direction);
      case 'omie':
        return this.syncOmieOrders(direction);
      case 'tiny':
        return this.syncTinyOrders(direction);
      default:
        throw new Error(`Unsupported ERP system: ${this.config.erp_system}`);
    }
  }

  async syncCustomers(direction: string = 'export') {
    switch (this.config.erp_system) {
      case 'bling':
        return this.syncBlingCustomers(direction);
      case 'omie':
        return this.syncOmieCustomers(direction);
      case 'tiny':
        return this.syncTinyCustomers(direction);
      default:
        throw new Error(`Unsupported ERP system: ${this.config.erp_system}`);
    }
  }

  // Bling ERP Integration
  private async syncBlingProducts(direction: string) {
    const apiKey = this.config.api_key;
    const baseUrl = 'https://bling.com.br/Api/v2';
    
    if (direction === 'export') {
      // Export products from our system to Bling
      const { data: products } = await this.supabase
        .from('products')
        .select('*')
        .eq('is_available', true);

      let successCount = 0;
      const errors = [];

      for (const product of products || []) {
        try {
          const blingProduct = {
            nome: product.name,
            codigo: product.id,
            preco: product.price,
            descricao: product.description,
            categoria: product.category_id,
          };

          const response = await fetch(`${baseUrl}/produto/json/?apikey=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produto: blingProduct }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const error = await response.text();
            errors.push({ product: product.id, error });
          }
        } catch (error: any) {
          errors.push({ product: product.id, error: error.message });
        }
      }

      return { successCount, errors, totalProcessed: products?.length || 0 };
    } else {
      // Import products from Bling to our system
      const response = await fetch(`${baseUrl}/produtos/json/?apikey=${apiKey}`);
      const data = await response.json();
      
      let successCount = 0;
      const errors = [];

      for (const item of data.retorno?.produtos || []) {
        try {
          const product = item.produto;
          
          const { error } = await this.supabase
            .from('products')
            .upsert({
              name: product.nome,
              description: product.descricao || '',
              price: parseFloat(product.preco) || 0,
              is_available: true,
            }, { onConflict: 'name' });

          if (error) {
            errors.push({ product: product.nome, error: error.message });
          } else {
            successCount++;
          }
        } catch (error: any) {
          errors.push({ product: item.produto?.nome, error: error.message });
        }
      }

      return { successCount, errors, totalProcessed: data.retorno?.produtos?.length || 0 };
    }
  }

  private async syncBlingOrders(direction: string) {
    const apiKey = this.config.api_key;
    const baseUrl = 'https://bling.com.br/Api/v2';
    
    if (direction === 'export') {
      // Export orders to Bling
      const { data: orders } = await this.supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(*)),
          addresses(*)
        `)
        .eq('status', 'delivered')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      let successCount = 0;
      const errors = [];

      for (const order of orders || []) {
        try {
          const blingOrder = {
            numero: order.id.slice(-8),
            data: order.created_at.split('T')[0],
            cliente: {
              nome: order.customer_name,
              telefone: order.customer_phone,
            },
            itens: order.order_items?.map((item: any) => ({
              descricao: item.products?.name,
              qtde: item.quantity,
              vlr_unit: item.unit_price,
            })),
            totais: {
              totprod: order.total_amount,
            },
          };

          const response = await fetch(`${baseUrl}/pedido/json/?apikey=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedido: blingOrder }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const error = await response.text();
            errors.push({ order: order.id, error });
          }
        } catch (error: any) {
          errors.push({ order: order.id, error: error.message });
        }
      }

      return { successCount, errors, totalProcessed: orders?.length || 0 };
    }

    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  private async syncBlingCustomers(direction: string) {
    const apiKey = this.config.api_key;
    const baseUrl = 'https://bling.com.br/Api/v2';
    
    if (direction === 'export') {
      // Export customers to Bling
      const { data: customers } = await this.supabase
        .from('profiles')
        .select('*')
        .not('phone', 'is', null);

      let successCount = 0;
      const errors = [];

      for (const customer of customers || []) {
        try {
          const blingCustomer = {
            nome: customer.full_name,
            email: customer.email,
            telefone: customer.phone,
          };

          const response = await fetch(`${baseUrl}/contato/json/?apikey=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contato: blingCustomer }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const error = await response.text();
            errors.push({ customer: customer.id, error });
          }
        } catch (error: any) {
          errors.push({ customer: customer.id, error: error.message });
        }
      }

      return { successCount, errors, totalProcessed: customers?.length || 0 };
    }

    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  // Omie ERP Integration (similar structure)
  private async syncOmieProducts(direction: string) {
    // Implement Omie API integration
    logStep("Omie products sync", { direction });
    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  private async syncOmieOrders(direction: string) {
    // Implement Omie API integration
    logStep("Omie orders sync", { direction });
    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  private async syncOmieCustomers(direction: string) {
    // Implement Omie API integration
    logStep("Omie customers sync", { direction });
    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  // Tiny ERP Integration (similar structure)
  private async syncTinyProducts(direction: string) {
    // Implement Tiny API integration
    logStep("Tiny products sync", { direction });
    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  private async syncTinyOrders(direction: string) {
    // Implement Tiny API integration
    logStep("Tiny orders sync", { direction });
    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  private async syncTinyCustomers(direction: string) {
    // Implement Tiny API integration
    logStep("Tiny customers sync", { direction });
    return { successCount: 0, errors: [], totalProcessed: 0 };
  }

  private supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep("ERP sync request received");

    const { erp_system, sync_type, direction = 'export' }: ERPSyncRequest = await req.json();
    
    // Get ERP configuration
    const { data: erpConfig, error: configError } = await supabase
      .from('erp_configurations')
      .select('*')
      .eq('erp_system', erp_system)
      .eq('sync_enabled', true)
      .single();

    if (configError || !erpConfig) {
      throw new Error(`ERP configuration not found or disabled for ${erp_system}`);
    }

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('erp_sync_logs')
      .insert({
        erp_system,
        sync_type,
        status: 'running',
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }

    logStep("Sync started", { syncId: syncLog.id, erp_system, sync_type });

    const connector = new ERPConnector(erpConfig);
    const syncTypes = sync_type === 'all' ? ['products', 'orders', 'customers'] : [sync_type];
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    const allErrors: any[] = [];

    for (const type of syncTypes) {
      try {
        let result;
        
        switch (type) {
          case 'products':
            result = await connector.syncProducts(direction);
            break;
          case 'orders':
            result = await connector.syncOrders(direction);
            break;
          case 'customers':
            result = await connector.syncCustomers(direction);
            break;
          default:
            continue;
        }

        totalProcessed += result.totalProcessed;
        totalSuccess += result.successCount;
        allErrors.push(...result.errors);
        
        logStep(`${type} sync completed`, result);
        
      } catch (error: any) {
        logStep(`Error syncing ${type}`, { error: error.message });
        allErrors.push({ type, error: error.message });
      }
    }

    // Update sync log
    await supabase
      .from('erp_sync_logs')
      .update({
        status: allErrors.length === 0 ? 'completed' : 'failed',
        records_processed: totalProcessed,
        records_success: totalSuccess,
        records_error: totalProcessed - totalSuccess,
        error_details: allErrors.length > 0 ? { errors: allErrors } : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLog.id);

    // Update ERP configuration last sync
    await supabase
      .from('erp_configurations')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', erpConfig.id);

    logStep("ERP sync completed", {
      totalProcessed,
      totalSuccess,
      errorCount: allErrors.length
    });

    return new Response(JSON.stringify({
      success: true,
      sync_id: syncLog.id,
      summary: {
        total_processed: totalProcessed,
        successful: totalSuccess,
        errors: totalProcessed - totalSuccess,
      },
      errors: allErrors,
      message: `ERP sync completed successfully`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep("ERP sync error", { error: error.message });
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});