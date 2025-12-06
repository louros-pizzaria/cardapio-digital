import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProgressBar } from '@/components/order-status/ProgressBar';
import { TimelineEvents } from '@/components/order-status/TimelineEvents';
import { DeliveryInfo } from '@/components/order-status/DeliveryInfo';
import { OrderItemsList } from '@/components/order-status/OrderItemsList';
import { FinancialSummary } from '@/components/order-status/FinancialSummary';
import { PaymentInfo } from '@/components/order-status/PaymentInfo';
import { OrderChatPanel } from '@/components/OrderChatPanel';
import { useOrderChat } from '@/hooks/useOrderChat';
import { getOrderStatusInfo, calculateEstimatedDelivery } from '@/utils/orderStatusHelpers';
import { useOrderItems } from '@/hooks/useOrderItems';

const OrderStatusModern = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useUnifiedAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const orderChannelRef = useRef<any>(null);
  
  // Usar o hook para buscar items com suporte a resolução de nomes de bordas
  const { items: orderItems, loading: loadingItems, getCrustName } = useOrderItems(order?.id, true);

  // Hook de chat para contagem de não lidas - APENAS SE ORDER EXISTIR
  const { unreadCount } = useOrderChat(order?.id, 'customer');

  useEffect(() => {
    if (!orderId || !user) return;
    fetchOrder();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [orderId, user]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          addresses (*)
        `)
        .eq('id', orderId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (orderError) throw orderError;
      
      if (!orderData) {
        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchOrder();
        }
        
        toast({
          title: "Pedido não encontrado",
          description: "Este pedido não existe ou você não tem permissão para visualizá-lo.",
          variant: "destructive"
        });
        navigate('/orders');
        return;
      }

      // Buscar informações da loja
      const { data: storeData } = await supabase
        .from('store_info')
        .select('*')
        .single();

      setOrder(orderData);
      setStoreInfo(storeData);
      setRetryCount(0);
    } catch (error: any) {
      console.error('Erro ao carregar pedido:', error);
      
      if (retryCount < 3) {
        setRetryCount(retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return fetchOrder();
      }
      
      toast({
        title: "Erro ao carregar pedido",
        description: error.message,
        variant: "destructive",
      });
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (orderChannelRef.current) {
      return () => {};
    }

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          setOrder(payload.new);
          
          toast({
            title: "Status atualizado",
            description: getOrderStatusInfo(payload.new.status).label,
          });
        }
      )
      .subscribe();

    orderChannelRef.current = channel;

    return () => {
      if (orderChannelRef.current) {
        supabase.removeChannel(orderChannelRef.current);
        orderChannelRef.current = null;
      }
    };
  };

  const handleOpenChat = () => {
    setShowChat(true);
  };

  const handleNewOrder = () => {
    navigate('/menu');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-muted-foreground">Pedido não encontrado</p>
            <Button onClick={() => navigate('/orders')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para meus pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getOrderStatusInfo(order.status);
  const estimatedTime = calculateEstimatedDelivery(order);
  const isOrderActive = order.status !== 'delivered' && order.status !== 'cancelled';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/orders')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">
                Pedido #{order.order_number}
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
              {statusInfo.label}
            </Badge>
            {estimatedTime && (
              <p className="text-sm text-muted-foreground">
                Previsão: <span className="font-semibold text-foreground">{estimatedTime}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Progress Bar */}
        {order.status !== 'cancelled' && (
          <Card className="border-border">
            <CardContent className="p-4">
              <ProgressBar 
                currentStatus={order.status} 
                deliveryMethod={order.delivery_method}
              />
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card className="border-border">
          <CardContent className="p-4">
            <TimelineEvents order={order} />
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <DeliveryInfo 
          order={order} 
          address={order.addresses}
          storeInfo={storeInfo}
        />

        {/* Order Items */}
        <OrderItemsList items={orderItems} getCrustName={getCrustName} />

        {/* Financial Summary */}
        <FinancialSummary order={order} />

        {/* Payment Info */}
        <PaymentInfo order={order} />
      </div>

      {/* Fixed Footer Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-20">
        <div className="max-w-2xl mx-auto">
          {isOrderActive ? (
            <Button
              onClick={handleOpenChat}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white relative"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Chat com a Loja
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white h-6 w-6 flex items-center justify-center rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNewOrder}
              className="w-full"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Fazer Novo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Sheet do Chat */}
      <Sheet open={showChat} onOpenChange={setShowChat}>
        <SheetContent side="right" className="w-full sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat com {storeInfo?.name || 'a Loja'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 h-[calc(100vh-120px)]">
            <OrderChatPanel 
              orderId={order?.id || ''} 
              customerName="Atendente"
              isCustomerView={true}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default OrderStatusModern;
