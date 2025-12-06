// ===== MODAL DE PEDIDOS AGUARDANDO PAGAMENTO =====

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Clock, RefreshCw, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PendingOrder {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface PendingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewDetails: (orderId: string) => void;
}

export const PendingPaymentModal = ({ isOpen, onClose, onViewDetails }: PendingPaymentModalProps) => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, total_amount, payment_method, created_at')
        .eq('payment_status', 'pending_payment')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar pedidos pendentes:', error);
      toast.error('Erro ao carregar pedidos pendentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingOrders();
      
      // Auto-refresh a cada 30 segundos
      const interval = setInterval(fetchPendingOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleCheckPayment = async (orderId: string) => {
    toast.info('Verificando status do pagamento...', {
      description: 'Aguarde alguns segundos'
    });
    
    // Aqui você pode chamar uma edge function para verificar o status no gateway de pagamento
    setTimeout(() => {
      fetchPendingOrders();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            Pagamentos Pendentes
            <Badge variant="secondary">{orders.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pedidos aguardando confirmação de pagamento
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingOrders}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            {orders.length === 0 ? (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum pagamento pendente</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            #{order.order_number}
                          </span>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(order.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </Badge>
                        </div>

                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Cliente:</span> {order.customer_name}</p>
                          <p><span className="font-medium">Telefone:</span> {order.customer_phone}</p>
                          <p><span className="font-medium">Valor:</span> R$ {order.total_amount.toFixed(2)}</p>
                          <p><span className="font-medium">Pagamento:</span> {order.payment_method}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckPayment(order.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Verificar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onViewDetails(order.id);
                            onClose();
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
