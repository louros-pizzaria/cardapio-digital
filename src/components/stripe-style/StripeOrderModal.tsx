import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Printer, 
  X, 
  Clock, 
  Check, 
  ChefHat, 
  Truck, 
  Package,
  CheckCircle,
  MessageCircle,
  RefreshCw,
  Link2,
  AlertCircle
} from "lucide-react";
import { useOrderItems } from "@/hooks/useOrderItems";
import { useStoreInfo } from "@/hooks/useStoreInfo";
import { useThermalPrint } from "@/hooks/useThermalPrint";
import { useOrderChat } from "@/hooks/useOrderChat";
import { OrderChatPanel } from "@/components/OrderChatPanel";
import { OrderTimeline } from "@/components/OrderTimeline";
import { StripeItemsList } from "./StripeItemsList";

import { StripeInfoCards } from "./StripeInfoCards";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StripeOrderModalProps {
  order: any;
  onClose: () => void;
  onConfirmOrder?: (orderId: string) => void;
  onStartPreparation?: (orderId: string) => void;
  onMarkReady?: (orderId: string, deliveryMethod: string) => void;
  onMarkPickedUp?: (orderId: string) => void;
  onMarkInDelivery?: (orderId: string) => void;
  onMarkDelivered?: (orderId: string) => void;
  onCancelOrder?: (orderId: string) => void;
}

export const StripeOrderModal = ({
  order,
  onClose,
  onConfirmOrder,
  onStartPreparation,
  onMarkReady,
  onMarkPickedUp,
  onMarkInDelivery,
  onMarkDelivered,
  onCancelOrder,
}: StripeOrderModalProps) => {
  const [showChat, setShowChat] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { items, loading: itemsLoading } = useOrderItems(order?.id, !!order);
  const { storeInfo } = useStoreInfo();
  const { printOrder } = useThermalPrint();
  const { unreadCount } = useOrderChat(order?.id);

  const isPresencialPayment = ['credit_card_delivery', 'debit_card_delivery', 'cash'].includes(order?.payment_method);

  // Auto-scroll para o topo ao abrir
  useEffect(() => {
    if (rightColumnRef.current) {
      rightColumnRef.current.scrollTop = 0;
    }
  }, [order?.id]);

  // Auto-reload a cada 15s para pedidos ativos
  useEffect(() => {
    if (!order || ['delivered', 'cancelled'].includes(order.status)) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['order-items', order.id] });
      toast.info("Pedido atualizado", { duration: 2000 });
    }, 15000);

    return () => clearInterval(interval);
  }, [order?.id, order?.status, queryClient]);

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC - Fechar modal
      if (e.key === 'Escape' && !showChat && !showTimeline && !showCancelDialog) {
        onClose();
      }
      
      // CTRL+S - Ação primária
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handlePrimaryAction();
      }
      
      // R - Recarregar
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleReload();
      }
      
      // P - Imprimir
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, showChat, showTimeline, showCancelDialog]);

  const handlePrint = () => {
    if (items && items.length > 0) {
      printOrder(order.id);
      toast.success("Pedido enviado para impressão");
    }
  };

  const handleReload = () => {
    queryClient.invalidateQueries({ queryKey: ['order-items', order.id] });
    toast.success("Pedido recarregado", { duration: 2000 });
  };

  const handleCopyLink = () => {
    const publicLink = `${window.location.origin}/order/${order.id}`;
    navigator.clipboard.writeText(publicLink);
    toast.success("Link copiado para a área de transferência");
  };

  const handleConfirmPayment = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', order.id);

      if (error) throw error;

      toast.success("Pagamento confirmado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      onClose();
    } catch (error: any) {
      toast.error("Erro ao confirmar pagamento: " + error.message);
    }
  };

  const handlePrimaryAction = () => {
    if (!order) return;

    // Confirmação de pagamento presencial tem prioridade
    if (order.payment_status === 'pending' && isPresencialPayment) {
      handleConfirmPayment();
      return;
    }

    switch (order.status) {
      case 'pending':
      case 'confirmed':
        onStartPreparation?.(order.id);
        break;
      case 'preparing':
        if (order.delivery_method === 'delivery') {
          onMarkInDelivery?.(order.id);
        } else {
          onMarkReady?.(order.id, order.delivery_method);
        }
        break;
      case 'ready':
      case 'in_delivery':
        onMarkDelivered?.(order.id);
        break;
    }
  };

  const getPrimaryActionButton = () => {
    if (!order || ['delivered', 'cancelled'].includes(order.status)) return null;

    // Confirmação de pagamento presencial tem prioridade
    if (order.payment_status === 'pending' && isPresencialPayment) {
      return (
        <Button 
          size="lg" 
          onClick={handleConfirmPayment}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="h-4 w-4 mr-2" />
          Confirmar Pagamento Recebido
        </Button>
      );
    }

    switch (order.status) {
      case 'pending':
      case 'confirmed':
        return (
          <Button 
            size="lg" 
            onClick={() => onStartPreparation?.(order.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ChefHat className="h-4 w-4 mr-2" />
            Iniciar Preparo
          </Button>
        );
      
      case 'preparing':
        return order.delivery_method === 'delivery' ? (
          <Button 
            size="lg"
            onClick={() => onMarkInDelivery?.(order.id)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Truck className="h-4 w-4 mr-2" />
            Em Rota de Entrega
          </Button>
        ) : (
          <Button 
            size="lg"
            onClick={() => onMarkReady?.(order.id, order.delivery_method)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Pronto para Retirada
          </Button>
        );
      
      case 'ready':
      case 'in_delivery':
        return (
          <Button 
            size="lg"
            onClick={() => onMarkDelivered?.(order.id)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizar Pedido
          </Button>
        );
      
      default:
        return null;
    }
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diff = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
    
    if (diff < 1) return 'agora mesmo';
    if (diff < 60) return `${diff} min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)} dias`;
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
      preparing: 'bg-orange-50 text-orange-700 border-orange-200',
      ready: 'bg-green-50 text-green-700 border-green-200',
      picked_up: 'bg-teal-50 text-teal-700 border-teal-200',
      in_delivery: 'bg-purple-50 text-purple-700 border-purple-200',
      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
    };
    return classes[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Recebido',
      confirmed: 'Confirmado',
      preparing: 'Em Preparo',
      ready: 'Pronto',
      picked_up: 'Retirado',
      in_delivery: 'A Caminho',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={!!order} onOpenChange={onClose}>
        <DialogOverlay className="bg-black/50" />
        <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 flex flex-col">
          {/* HEADER FIXO */}
          <div className="px-8 py-6 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-start justify-between">
              {/* ESQUERDA - Título e Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pedido #{order.order_number}
                  </h2>
                  <Badge 
                    variant="outline"
                    className={`text-xs ${getStatusBadgeClass(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Recebido há {getRelativeTime(order.created_at)}</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span>{formatDateTime(order.created_at)}</span>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium text-gray-600">{storeInfo?.name || 'Pizza Prime'}</span>
                </div>
              </div>

              {/* DIREITA - Ações Rápidas */}
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrint}
                  title="Imprimir (P)"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleReload}
                  title="Recarregar (R)"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopyLink}
                  title="Copiar link público"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowChat(true)}
                  title="Chat"
                  className="text-gray-600 hover:text-gray-900 relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowTimeline(true)}
                  title="Histórico"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* CONTEÚDO - 2 COLUNAS */}
          <div className="flex-1 flex overflow-hidden">
            {/* COLUNA ESQUERDA - Itens (35%) */}
            <div className="w-[35%] border-r border-gray-200 bg-gray-50">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <StripeItemsList items={items || []} loading={itemsLoading} />
                </div>
              </ScrollArea>
            </div>

            {/* COLUNA DIREITA - Informações (65%) */}
            <div className="flex-1 bg-white">
              <ScrollArea className="h-full" ref={rightColumnRef}>
                <div className="p-8">
                  <StripeInfoCards order={order} items={items} />
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* FOOTER FIXO - Ações */}
          <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Botão de Cancelar */}
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setShowCancelDialog(true)}
                disabled={['delivered', 'cancelled'].includes(order.status)}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Pedido
              </Button>

              {/* Botão Primário Dinâmico */}
              {getPrimaryActionButton()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CHAT LATERAL */}
      <Sheet open={showChat} onOpenChange={setShowChat}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Chat do Pedido</SheetTitle>
          </SheetHeader>
          <OrderChatPanel orderId={order.id} customerName={order.customer_name} />
        </SheetContent>
      </Sheet>

      {/* TIMELINE LATERAL */}
      <Sheet open={showTimeline} onOpenChange={setShowTimeline}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Histórico do Pedido</SheetTitle>
          </SheetHeader>
          <OrderTimeline order={order} />
        </SheetContent>
      </Sheet>

      {/* DIÁLOGO DE CANCELAMENTO */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Cancelar Pedido
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onCancelOrder?.(order.id);
                setShowCancelDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
