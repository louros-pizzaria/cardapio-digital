// ===== UTILITÁRIOS GERAIS =====

import { OrderStatus, PaymentStatus } from '@/types';

export const getOrderStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    out_for_delivery: 'Saiu para entrega',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };
  return statusMap[status] || status;
};

export const getPaymentStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    failed: 'Falhou',
    refunded: 'Reembolsado',
  };
  return statusMap[status] || status;
};

export const getOrderStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    confirmed: 'text-blue-600 bg-blue-50',
    preparing: 'text-orange-600 bg-orange-50',
    out_for_delivery: 'text-purple-600 bg-purple-50',
    delivered: 'text-green-600 bg-green-50',
    cancelled: 'text-red-600 bg-red-50',
  };
  return colorMap[status] || 'text-gray-600 bg-gray-50';
};

export const getPaymentStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    paid: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
    refunded: 'text-orange-600 bg-orange-50',
  };
  return colorMap[status] || 'text-gray-600 bg-gray-50';
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const roundToTwo = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const isEmptyObject = (obj: object): boolean => {
  return Object.keys(obj).length === 0;
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};