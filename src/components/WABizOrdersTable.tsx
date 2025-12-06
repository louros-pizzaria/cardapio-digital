// ===== TABELA DE PEDIDOS - PADRÃO WABIZ =====

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Phone, MapPin, Truck, Store } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrdersTableProps {
  orders: any[];
  onViewDetails: (order: any) => void;
  loading?: boolean;
}

export const WABizOrdersTable = ({ orders, onViewDetails, loading }: OrdersTableProps) => {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-500 hover:bg-yellow-600",
      confirmed: "bg-blue-500 hover:bg-blue-600",
      preparing: "bg-purple-500 hover:bg-purple-600",
      ready: "bg-green-500 hover:bg-green-600",
      in_delivery: "bg-orange-500 hover:bg-orange-600",
      delivered: "bg-gray-500 hover:bg-gray-600",
      cancelled: "bg-red-500 hover:bg-red-600"
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pendente",
      confirmed: "Confirmado", 
      preparing: "Preparando",
      ready: "Pronto",
      in_delivery: "Em entrega",
      delivered: "Entregue",
      cancelled: "Cancelado"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getDeliveryType = (order: any) => {
    const method = (order.delivery_method || '').toString().toLowerCase();
    if (['delivery', 'entrega', 'delivery_service'].includes(method)) return 'Entrega';
    if (['pickup', 'retirada', 'takeaway', 'store_pickup'].includes(method)) return 'Retirada';
    // Fallback por presença de endereço
    if (order.address_id || order.delivery_address_snapshot || order.street || order.neighborhood) return 'Entrega';
    return 'Retirada';
  };
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      cash: 'Dinheiro',
      credit_card_delivery: 'Cartão de Crédito',
      debit_card_delivery: 'Cartão de Débito',
    };
    return labels[method] || 'Não informado';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
          <p className="text-gray-500">Não há pedidos para exibir nesta categoria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-20 font-semibold">Nº</TableHead>
            <TableHead className="font-semibold">Enviado em</TableHead>
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold">Entrega/Retirada</TableHead>
            <TableHead className="font-semibold">Valor</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-20 font-semibold">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow 
              key={order.id} 
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onViewDetails(order)}
            >
              <TableCell className="font-mono text-sm font-medium">
                #{order.order_number}
              </TableCell>
              
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                  <div className="text-gray-500">
                    {format(new Date(order.created_at), "HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-semibold">
                      {getInitials(order.customer_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {order.customer_phone}
                    </div>
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 flex items-center gap-1">
                    {getDeliveryType(order) === 'Entrega' ? (
                      <Truck className="h-3 w-3" />
                    ) : (
                      <Store className="h-3 w-3" />
                    )}
                    {getDeliveryType(order)}
                  </div>
                  {order.neighborhood && (
                    <div className="text-gray-500 text-xs">
                      {order.neighborhood}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">
                    R$ {order.total_amount.toFixed(2)}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {getPaymentMethodLabel(order.payment_method)}
                  </div>
                </div>
              </TableCell>
              
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`${getStatusColor(order.status)} text-white border-0 font-medium`}
                  >
                    {getStatusLabel(order.status)}
                  </Badge>
                  
                  {/* Badge "A COBRAR" para pedidos presenciais com pagamento pendente */}
                  {(order.payment_status === 'pending' || order.payment_status === 'to_collect') && 
                   ['cash', 'credit_card_delivery', 'debit_card_delivery'].includes(order.payment_method) && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50 ml-2">
                      💰 A COBRAR
                    </Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(order)}
                  className="h-8 w-8 p-0 hover:bg-blue-100"
                >
                  <Eye className="h-4 w-4 text-blue-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};