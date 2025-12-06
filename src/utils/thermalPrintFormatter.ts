// ===== FORMATAÇÃO DE PEDIDOS PARA PREVIEW TÉRMICO =====

import { PreviewLine } from '@/types/thermalPreview';

const PRINTER_WIDTH = 32; // 58mm = ~32 caracteres

function padLine(text: string, width: number = PRINTER_WIDTH): string {
  return text.padEnd(width, ' ');
}

function centerText(text: string, width: number = PRINTER_WIDTH): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function splitLongText(text: string, maxWidth: number = PRINTER_WIDTH): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function formatOrderForPreview(order: any): PreviewLine[] {
  const lines: PreviewLine[] = [];

  // Cabeçalho
  lines.push({ type: 'center', content: '================================', centered: true });
  lines.push({ type: 'center', content: 'COMANDA DE PEDIDO', centered: true, bold: true });
  lines.push({ type: 'center', content: '================================', centered: true });
  lines.push({ type: 'text', content: '' });

  // Número do pedido
  lines.push({ type: 'bold', content: `PEDIDO #${order.order_number || order.id.slice(0, 8)}`, bold: true });
  lines.push({ type: 'text', content: new Date(order.created_at).toLocaleString('pt-BR') });
  lines.push({ type: 'separator', content: '--------------------------------' });

  // Dados do cliente
  lines.push({ type: 'bold', content: 'CLIENTE', bold: true });
  lines.push({ type: 'text', content: order.customer_name });
  lines.push({ type: 'text', content: order.customer_phone });
  lines.push({ type: 'separator', content: '--------------------------------' });

  // Endereço de entrega
  if (order.delivery_address) {
    const addr = order.delivery_address;
    lines.push({ type: 'bold', content: 'ENTREGA', bold: true });
    lines.push({ type: 'text', content: `${addr.street}, ${addr.number}` });
    if (addr.complement) {
      lines.push({ type: 'text', content: addr.complement });
    }
    lines.push({ type: 'text', content: `${addr.neighborhood} - ${addr.city}/${addr.state}` });
    lines.push({ type: 'text', content: `CEP: ${addr.zip_code}` });
    lines.push({ type: 'separator', content: '--------------------------------' });
  }

  // Itens do pedido
  lines.push({ type: 'bold', content: 'ITENS', bold: true });
  lines.push({ type: 'separator', content: '--------------------------------' });

  order.items.forEach((item: any) => {
    const itemLine = `${item.quantity}x ${item.product_name}`;
    const priceLine = formatCurrency(item.total_price);
    const spacing = PRINTER_WIDTH - itemLine.length - priceLine.length;
    lines.push({ 
      type: 'text', 
      content: itemLine + ' '.repeat(Math.max(1, spacing)) + priceLine 
    });
    
    if (item.notes) {
      const noteLines = splitLongText(`  OBS: ${item.notes}`, PRINTER_WIDTH);
      noteLines.forEach(line => {
        lines.push({ type: 'text', content: line });
      });
    }
  });

  lines.push({ type: 'separator', content: '--------------------------------' });

  // Totais
  const subtotalLabel = 'Subtotal:';
  const subtotalValue = formatCurrency(order.subtotal);
  const subtotalSpacing = PRINTER_WIDTH - subtotalLabel.length - subtotalValue.length;
  lines.push({ 
    type: 'text', 
    content: subtotalLabel + ' '.repeat(Math.max(1, subtotalSpacing)) + subtotalValue 
  });

  if (order.delivery_fee > 0) {
    const deliveryLabel = 'Taxa de Entrega:';
    const deliveryValue = formatCurrency(order.delivery_fee);
    const deliverySpacing = PRINTER_WIDTH - deliveryLabel.length - deliveryValue.length;
    lines.push({ 
      type: 'text', 
      content: deliveryLabel + ' '.repeat(Math.max(1, deliverySpacing)) + deliveryValue 
    });
  }

  lines.push({ type: 'separator', content: '================================' });

  const totalLabel = 'TOTAL:';
  const totalValue = formatCurrency(order.total_amount);
  const totalSpacing = PRINTER_WIDTH - totalLabel.length - totalValue.length;
  lines.push({ 
    type: 'double-height', 
    content: totalLabel + ' '.repeat(Math.max(1, totalSpacing)) + totalValue,
    bold: true 
  });

  lines.push({ type: 'separator', content: '================================' });

  // Pagamento
  const paymentMethod = order.payment_method === 'pix' ? 'PIX' :
                       order.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                       order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                       order.payment_method === 'money' ? 'Dinheiro' : 'Outro';
  
  lines.push({ type: 'text', content: `Pagamento: ${paymentMethod}` });
  
  const paymentStatus = order.payment_status === 'paid' ? 'PAGO' :
                       order.payment_status === 'pending' ? 'PENDENTE' : 'AGUARDANDO';
  lines.push({ type: 'text', content: `Status: ${paymentStatus}` });

  // Observações
  if (order.notes) {
    lines.push({ type: 'separator', content: '--------------------------------' });
    lines.push({ type: 'bold', content: 'OBSERVAÇÕES', bold: true });
    const noteLines = splitLongText(order.notes, PRINTER_WIDTH);
    noteLines.forEach(line => {
      lines.push({ type: 'text', content: line });
    });
  }

  // Rodapé
  lines.push({ type: 'text', content: '' });
  lines.push({ type: 'center', content: 'Obrigado pela preferência!', centered: true });
  lines.push({ type: 'text', content: '' });
  lines.push({ type: 'cut', content: '' });

  return lines;
}
