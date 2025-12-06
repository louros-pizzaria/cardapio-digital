import { addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface OrderStatus {
  value: string;
  label: string;
  color: string;
  bgColor: string;
}

export const getOrderStatusInfo = (status: string): OrderStatus => {
  const statusMap: Record<string, OrderStatus> = {
    pending: {
      value: 'pending',
      label: 'Aguardando Confirmação',
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950/30',
    },
    confirmed: {
      value: 'confirmed',
      label: 'Confirmado',
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-950/30',
    },
    preparing: {
      value: 'preparing',
      label: 'Em Preparo',
      color: 'text-orange-700 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-950/30',
    },
    ready: {
      value: 'ready',
      label: 'Pronto',
      color: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-950/30',
    },
    in_delivery: {
      value: 'in_delivery',
      label: 'Em Rota de Entrega',
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-950/30',
    },
    delivered: {
      value: 'delivered',
      label: 'Entregue',
      color: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/30',
    },
    cancelled: {
      value: 'cancelled',
      label: 'Cancelado',
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-950/30',
    },
  };

  return statusMap[status] || statusMap.pending;
};

export const calculateEstimatedDelivery = (order: any): string | null => {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return null;
  }

  const createdAt = new Date(order.created_at);
  let minutesToAdd = 0;

  switch (order.status) {
    case 'pending':
    case 'confirmed':
      minutesToAdd = 35;
      break;
    case 'preparing':
      minutesToAdd = 25;
      break;
    case 'ready':
      minutesToAdd = 15;
      break;
    case 'in_delivery':
      minutesToAdd = 10;
      break;
    default:
      minutesToAdd = 35;
  }

  const estimatedTime = addMinutes(createdAt, minutesToAdd);
  return format(estimatedTime, "HH:mm", { locale: ptBR });
};

export const groupItemsByCategory = (items: any[]): Record<string, any[]> => {
  const grouped: Record<string, any[]> = {};
  
  items.forEach(item => {
    const category = item.products?.category || 'Outros';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });

  return grouped;
};

export const formatWhatsAppMessage = (orderId: string): string => {
  const message = `Olá! Gostaria de acompanhar meu pedido #${orderId.slice(0, 8)}`;
  return encodeURIComponent(message);
};

export const formatCrustName = (crustIdentifier: string): string => {
  // Mapeamento de slugs para nomes legíveis
  const crustMap: Record<string, string> = {
    'catupiry': 'Catupiry',
    'cheddar': 'Cheddar',
    'chocolate': 'Chocolate',
    'goiabada': 'Goiabada',
    'mussarela': 'Mussarela',
    'prestigio': 'Prestígio',
    'presunto_queijo': 'Presunto e Queijo',
    'presunto': 'Presunto',
  };
  
  const normalized = crustIdentifier.toLowerCase().trim();
  return crustMap[normalized] || crustIdentifier
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatExtraNames = (extras: string[]): string[] => {
  const extraMap: Record<string, string> = {
    'bacon': 'Bacon',
    'calabresa': 'Calabresa',
    'catupiry': 'Catupiry',
    'cebola': 'Cebola',
    'cebola_roxa': 'Cebola Roxa',
    'champignon': 'Champignon',
    'cheddar': 'Cheddar',
    'milho': 'Milho',
    'mussarela': 'Mussarela',
    'oregano': 'Orégano',
    'palmito': 'Palmito',
    'parmesao': 'Parmesão',
    'pepperoni': 'Pepperoni',
    'pimentao': 'Pimentão',
    'tomate': 'Tomate',
    'azeitona': 'Azeitona',
  };
  
  return extras.map(extra => {
    const normalized = extra.toLowerCase().trim();
    return extraMap[normalized] || extra
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });
};
