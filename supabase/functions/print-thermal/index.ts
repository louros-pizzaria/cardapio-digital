// ===== EDGE FUNCTION DE IMPRESSÃO TÉRMICA ELGIN =====

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Classe para formatação de comanda térmica
class ThermalPrinter {
  private content: string = '';
  private width: number = 32; // Largura padrão para impressoras térmicas 58mm

  // Comandos ESC/POS básicos
  private ESC = '\x1B';
  private GS = '\x1D';
  
  // Comandos de formatação
  private INIT = this.ESC + '@'; // Inicializar impressora
  private BOLD_ON = this.ESC + 'E\x01'; // Negrito ON
  private BOLD_OFF = this.ESC + 'E\x00'; // Negrito OFF
  private CENTER = this.ESC + 'a\x01'; // Centralizar
  private LEFT = this.ESC + 'a\x00'; // Alinhar à esquerda
  private CUT = this.GS + 'V\x00'; // Cortar papel
  private LINE_FEED = '\n';

  constructor() {
    this.content = this.INIT;
  }

  addText(text: string, bold = false, center = false): ThermalPrinter {
    if (center) this.content += this.CENTER;
    if (bold) this.content += this.BOLD_ON;
    
    this.content += text;
    
    if (bold) this.content += this.BOLD_OFF;
    if (center) this.content += this.LEFT;
    
    return this;
  }

  addLine(text = ''): ThermalPrinter {
    this.content += text + this.LINE_FEED;
    return this;
  }

  addSeparator(): ThermalPrinter {
    this.content += '-'.repeat(this.width) + this.LINE_FEED;
    return this;
  }

  addDoubleHeight(text: string): ThermalPrinter {
    this.content += this.GS + '!\x11' + text + this.GS + '!\x00';
    return this;
  }

  cut(): ThermalPrinter {
    this.content += this.CUT;
    return this;
  }

  getContent(): string {
    return this.content;
  }
}

interface OrderItem {
  quantity: number;
  name: string;
  unit_price: number;
  total_price: number;
  customizations?: any;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  delivery_fee: number;
  payment_method: string;
  created_at: string;
  status: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  notes?: string;
  items: OrderItem[];
}

function formatOrderForPrint(order: Order): string {
  const printer = new ThermalPrinter();
  const date = new Date(order.created_at).toLocaleString('pt-BR');

  printer
    .addLine()
    .addText('NOVA COMANDA', true, true)
    .addLine()
    .addSeparator()
    .addText(`Pedido: #${order.id.slice(-6).toUpperCase()}`, true)
    .addLine()
    .addText(`Data: ${date}`)
    .addLine()
    .addSeparator()
    .addText('CLIENTE:', true)
    .addLine()
    .addText(`Nome: ${order.customer_name}`)
    .addLine()
    .addText(`Tel: ${order.customer_phone}`)
    .addLine();

  // Endereço de entrega
  if (order.street) {
    printer
      .addSeparator()
      .addText('ENTREGA:', true)
      .addLine()
      .addText(`${order.street}, ${order.number}`)
      .addLine()
      .addText(`${order.neighborhood}`)
      .addLine()
      .addText(`${order.city}`)
      .addLine();
  }

  // Itens do pedido
  printer
    .addSeparator()
    .addText('ITENS:', true)
    .addLine();

  order.items.forEach(item => {
    printer
      .addText(`${item.quantity}x ${item.name}`)
      .addLine()
      .addText(`    R$ ${item.unit_price.toFixed(2)} un`)
      .addLine()
      .addText(`    Total: R$ ${item.total_price.toFixed(2)}`, true)
      .addLine();

    if (item.customizations) {
      printer.addText(`    Obs: ${JSON.stringify(item.customizations)}`).addLine();
    }
    printer.addLine();
  });

  // Total
  printer
    .addSeparator()
    .addText('RESUMO:', true)
    .addLine()
    .addText(`Subtotal: R$ ${(order.total_amount - order.delivery_fee).toFixed(2)}`)
    .addLine()
    .addText(`Taxa entrega: R$ ${order.delivery_fee.toFixed(2)}`)
    .addLine()
    .addText(`TOTAL: R$ ${order.total_amount.toFixed(2)}`, true)
    .addLine()
    .addSeparator()
    .addText(`Pagamento: ${order.payment_method.toUpperCase()}`)
    .addLine();

  // Observações
  if (order.notes) {
    printer
      .addSeparator()
      .addText('OBSERVAÇÕES:', true)
      .addLine()
      .addText(order.notes)
      .addLine();
  }

  printer
    .addSeparator()
    .addLine()
    .addText('Obrigado pela preferência!', false, true)
    .addLine()
    .addLine()
    .cut();

  return printer.getContent();
}

// Simular envio para impressora Elgin com detecção de erros específicos
async function sendToElginPrinter(content: string, printerIP?: string): Promise<{
  success: boolean;
  error_type?: string;
  error_message?: string;
  retryable?: boolean;
  suggested_action?: string;
}> {
  try {
    console.log('[THERMAL-PRINT] 🖨️ Enviando para impressora Elgin...');
    console.log(`[THERMAL-PRINT] 📍 IP: ${printerIP || 'USB'}`);
    console.log(`[THERMAL-PRINT] 📄 Conteúdo: ${content.length} bytes`);

    // Em produção real, aqui seria feita a conexão com a impressora
    // Via SDK Elgin ou protocolo de rede
    if (printerIP) {
      // Envio via rede TCP/IP
      console.log(`[THERMAL-PRINT] 🌐 Conectando via TCP: ${printerIP}:9100`);
      
      // Simular verificação de conexão de rede
      if (Math.random() < 0.1) { // 10% de chance de falha de rede (simulação)
        return {
          success: false,
          error_type: 'NETWORK_ERROR',
          error_message: 'Não foi possível conectar à impressora via rede',
          retryable: true,
          suggested_action: 'Verifique o IP da impressora e a conexão de rede'
        };
      }
    } else {
      // Envio via USB
      console.log('[THERMAL-PRINT] 🔌 Conectando via USB');
    }

    // Simular delay de impressão
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('[THERMAL-PRINT] ✅ Impressão enviada com sucesso!');
    return { success: true };
  } catch (error: any) {
    console.error('[THERMAL-PRINT] ❌ Erro ao imprimir:', error);
    
    return {
      success: false,
      error_type: 'UNKNOWN',
      error_message: error.message || 'Erro desconhecido na impressão',
      retryable: true,
      suggested_action: 'Tente novamente ou contate o suporte'
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[THERMAL-PRINT] 🚀 Solicitação de impressão recebida');

    const { orderId, printerIP, copies = 1, testMode = false, testOrder } = await req.json();

    if (!orderId) {
      throw new Error('ID do pedido é obrigatório');
    }

    let order: Order;

    // Modo de teste: usar pedido fornecido sem buscar no banco
    if (testMode && testOrder) {
      console.log('[THERMAL-PRINT] 🧪 Modo de teste ativado');
      order = testOrder as Order;
    } else {
      // Modo normal: buscar pedido no banco
      console.log(`[THERMAL-PRINT] 📋 Buscando pedido: ${orderId}`);
      
      // Inicializar Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          addresses (street, number, neighborhood, city),
          order_items (
            quantity,
            unit_price,
            total_price,
            customizations,
            products (name)
          )
        `)
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        throw new Error(`Pedido não encontrado: ${orderError?.message}`);
      }
      
      order = orderData as Order;
    }

    // Formatar dados para impressão
    const orderForPrint: Order = testMode ? {
      // Modo teste: usar dados diretos do testOrder
      ...order,
      items: order.items || []
    } : {
      // Modo normal: mapear dados do banco
      id: order.id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      total_amount: order.total_amount,
      delivery_fee: order.delivery_fee,
      payment_method: order.payment_method,
      created_at: order.created_at,
      status: order.status,
      street: (order as any).addresses?.street,
      number: (order as any).addresses?.number,
      neighborhood: (order as any).addresses?.neighborhood,
      city: (order as any).addresses?.city,
      notes: order.notes,
      items: ((order as any).order_items || []).map((item: any) => ({
        quantity: item.quantity,
        name: item.products?.name || item.name,
        unit_price: item.unit_price,
        total_price: item.total_price,
        customizations: item.customizations
      }))
    };

    // Gerar conteúdo da comanda
    const printContent = formatOrderForPrint(orderForPrint);

    // Enviar para impressora (múltiplas cópias se necessário)
    let successCount = 0;
    let lastError: any = null;
    
    for (let i = 0; i < copies; i++) {
      const result = await sendToElginPrinter(printContent, printerIP);
      if (result.success) {
        successCount++;
      } else {
        lastError = result;
      }
    }

    // Log da impressão (apenas em modo normal, não em teste)
    if (!testMode) {
      // Inicializar Supabase para log (se ainda não foi inicializado)
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('webhook_logs')
        .insert({
          platform: 'elgin_printer',
          event_type: 'thermal_print',
          payload: {
            order_id: orderId,
            printer_ip: printerIP,
            copies_requested: copies,
            copies_printed: successCount,
            print_content_size: printContent.length
          },
          status: successCount > 0 ? 'success' : 'failed'
        });
    }

    const response = {
      success: successCount > 0,
      message: successCount === copies 
        ? `Comanda impressa com sucesso! (${successCount}/${copies} cópias)`
        : successCount === 0 && lastError
          ? lastError.error_message
          : `Impressão parcial: ${successCount}/${copies} cópias`,
      copies_printed: successCount,
      copies_requested: copies,
      order_id: orderId,
      timestamp: new Date().toISOString(),
      error_type: successCount === 0 && lastError ? lastError.error_type : undefined,
      error_message: successCount === 0 && lastError ? lastError.error_message : undefined,
      retryable: successCount === 0 && lastError ? lastError.retryable : undefined,
      suggested_action: successCount === 0 && lastError ? lastError.suggested_action : undefined,
    };

    console.log('[THERMAL-PRINT] 📊 Resultado:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('[THERMAL-PRINT] ❌ Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});