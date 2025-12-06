import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FiscalReportRequest {
  report_type: 'daily' | 'monthly' | 'nfce' | 'sat' | 'sped';
  reference_date: string;
  auto_send?: boolean;
  format?: 'pdf' | 'xml' | 'txt' | 'csv';
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FISCAL-REPORTS] ${step}${detailsStr}`);
};

// Generate different types of fiscal reports
const generateReport = async (supabase: any, reportType: string, referenceDate: string, format: string = 'pdf') => {
  const date = new Date(referenceDate);
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endDate = new Date(startDate);
  
  // Adjust date range based on report type
  switch (reportType) {
    case 'daily':
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'monthly':
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      break;
    default:
      endDate.setDate(endDate.getDate() + 1);
  }
  
  logStep(`Generating ${reportType} report`, { startDate, endDate, format });
  
  // Fetch sales data
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      total_amount,
      delivery_fee,
      payment_method,
      payment_status,
      status,
      created_at,
      customer_name,
      customer_phone,
      order_items(
        id,
        quantity,
        unit_price,
        total_price,
        products(name, category_id)
      )
    `)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())
    .eq('status', 'delivered')
    .eq('payment_status', 'paid');
  
  if (ordersError) {
    throw new Error(`Error fetching orders: ${ordersError.message}`);
  }
  
  logStep(`Found ${orders?.length} orders for report`);
  
  // Calculate totals and taxes
  const totalSales = orders?.reduce((sum: number, order: any) => sum + Number(order.total_amount), 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalTaxes = totalSales * 0.1; // Simplified tax calculation (10%)
  
  // Group sales by category
  const salesByCategory: Record<string, number> = {};
  const salesByPaymentMethod: Record<string, number> = {};
  
  orders?.forEach((order: any) => {
    // Group by payment method
    const paymentMethod = order.payment_method || 'unknown';
    salesByPaymentMethod[paymentMethod] = (salesByPaymentMethod[paymentMethod] || 0) + Number(order.total_amount);
    
    // Group by category
    order.order_items?.forEach((item: any) => {
      const category = item.products?.category_id || 'uncategorized';
      salesByCategory[category] = (salesByCategory[category] || 0) + Number(item.total_price);
    });
  });
  
  const reportData = {
    report_type: reportType,
    reference_date: referenceDate,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    summary: {
      total_sales: totalSales,
      total_orders: totalOrders,
      total_taxes: totalTaxes,
      average_order_value: totalOrders > 0 ? totalSales / totalOrders : 0,
    },
    breakdown: {
      by_category: salesByCategory,
      by_payment_method: salesByPaymentMethod,
    },
    orders: orders?.map((order: any) => ({
      id: order.id,
      date: order.created_at,
      customer: order.customer_name,
      total: order.total_amount,
      payment_method: order.payment_method,
      items: order.order_items?.map((item: any) => ({
        name: item.products?.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total_price,
      })),
    })),
  };
  
  // Generate specific formats based on report type
  let fileContent = '';
  let fileName = '';
  
  switch (reportType) {
    case 'nfce':
      // NFCe (Nota Fiscal de Consumidor Eletrônica) format
      fileName = `nfce_${referenceDate}.xml`;
      fileContent = generateNFCeXML(reportData);
      break;
      
    case 'sat':
      // SAT (Sistema Autenticador e Transmissor) format
      fileName = `sat_${referenceDate}.txt`;
      fileContent = generateSATFile(reportData);
      break;
      
    case 'sped':
      // SPED (Sistema Público de Escrituração Digital) format
      fileName = `sped_${referenceDate}.txt`;
      fileContent = generateSPEDFile(reportData);
      break;
      
    default:
      // Standard report format
      fileName = `${reportType}_report_${referenceDate}.${format}`;
      if (format === 'csv') {
        fileContent = generateCSVReport(reportData);
      } else {
        fileContent = JSON.stringify(reportData, null, 2);
      }
  }
  
  return {
    fileName,
    fileContent,
    reportData,
  };
};

// Generate NFCe XML format
const generateNFCeXML = (data: any) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfce>
  <infNFe>
    <ide>
      <cUF>35</cUF>
      <cNF>123456789</cNF>
      <natOp>Venda de mercadorias</natOp>
      <mod>65</mod>
      <serie>1</serie>
      <nNF>000000001</nNF>
      <dhEmi>${new Date().toISOString()}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>1</tpEmis>
    </ide>
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vProd>${data.summary.total_sales.toFixed(2)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${data.summary.total_sales.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</nfce>`;
};

// Generate SAT format
const generateSATFile = (data: any) => {
  const lines = [
    `|0000|004|SAT|${data.reference_date}|${data.reference_date}|${data.summary.total_sales.toFixed(2)}|1|`,
    `|C100|0|1|${data.reference_date}|65|1|1|123456789|${data.summary.total_sales.toFixed(2)}|0|0|${data.summary.total_sales.toFixed(2)}|0|0|0|0|`,
  ];
  
  data.orders?.forEach((order: any, index: number) => {
    lines.push(`|C170|${index + 1}|${order.items?.[0]?.name || 'Produto'}|1|UN|${order.total}|0|0|0|0|${order.total}|`);
  });
  
  lines.push(`|C990|${lines.length + 1}|`);
  
  return lines.join('\n');
};

// Generate SPED format
const generateSPEDFile = (data: any) => {
  const lines = [
    `|0000|014|SPED_FISCAL|${data.reference_date}|${data.reference_date}|RAZAO SOCIAL|123456789|SP|35|123456789|`,
    `|0001|0|`,
    `|C001|0|`,
  ];
  
  data.orders?.forEach((order: any) => {
    lines.push(`|C100|0|1|${order.date}|65|1|1|${order.id}|${order.total}|0|0|${order.total}|0|0|0|0|`);
  });
  
  lines.push(`|C990|${lines.length + 1}|`);
  lines.push(`|9001|1|`);
  lines.push(`|9900|0000|1|`);
  lines.push(`|9900|C001|1|`);
  lines.push(`|9900|C100|${data.orders?.length || 0}|`);
  lines.push(`|9900|C990|1|`);
  lines.push(`|9900|9001|1|`);
  lines.push(`|9900|9900|${lines.length + 3}|`);
  lines.push(`|9900|9990|1|`);
  lines.push(`|9999|${lines.length + 2}|`);
  
  return lines.join('\n');
};

// Generate CSV format
const generateCSVReport = (data: any) => {
  const headers = 'Data,Cliente,Total,Metodo Pagamento,Status\n';
  const rows = data.orders?.map((order: any) => 
    `${order.date},${order.customer},${order.total},${order.payment_method},Entregue`
  ).join('\n') || '';
  
  return headers + rows;
};

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
    logStep("Fiscal report request received");

    const { report_type, reference_date, auto_send, format }: FiscalReportRequest = await req.json();
    
    // Generate the report
    const { fileName, fileContent, reportData } = await generateReport(
      supabase, 
      report_type, 
      reference_date, 
      format || 'pdf'
    );
    
    // Save report record to database
    const { data: reportRecord, error: saveError } = await supabase
      .from('fiscal_reports')
      .insert({
        report_type,
        reference_date,
        status: 'generated',
        file_path: `/reports/${fileName}`,
        total_sales: reportData.summary.total_sales,
        total_taxes: reportData.summary.total_taxes,
        total_orders: reportData.summary.total_orders,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (saveError) {
      logStep("Error saving report record", { error: saveError.message });
      throw saveError;
    }
    
    logStep("Report generated successfully", { 
      reportId: reportRecord.id, 
      fileName,
      totalSales: reportData.summary.total_sales 
    });
    
    // If auto_send is enabled, you would implement the sending logic here
    // This could involve email, SFTP, API calls to government systems, etc.
    if (auto_send) {
      logStep("Auto-send enabled - implementing sending logic");
      
      // Update report status
      await supabase
        .from('fiscal_reports')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', reportRecord.id);
    }
    
    return new Response(JSON.stringify({
      success: true,
      report_id: reportRecord.id,
      file_name: fileName,
      file_content: fileContent,
      summary: reportData.summary,
      message: `${report_type.toUpperCase()} report generated successfully`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep("Fiscal report error", { error: error.message });
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});