// ===== PAINEL UNIFICADO DE ATENDENTE - PADRÃO WABIZ =====

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WABizHeader } from "@/components/WABizHeader";
import { WABizOrdersTable } from "@/components/WABizOrdersTable";
import { StripeOrderModal } from "@/components/stripe-style/StripeOrderModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ThermalPrintQueue } from "@/components/ThermalPrintQueue";
import { PendingPaymentModal } from "@/components/PendingPaymentModal";
import { MessagesHub } from "@/components/MessagesHub";
import { useAttendant } from "@/providers/AttendantProvider";
import { useThermalPrint } from "@/hooks/useThermalPrint";
import { useSound } from "@/hooks/useSound";
import { toast } from "sonner";
import { Printer, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AttendantUnified() {
  const { 
    stats, 
    orders, 
    loading, 
    isUpdating, 
    refreshData,
    confirmOrder,
    startPreparation,
    markReady,
    markPickedUp,
    markInDelivery,
    markDelivered,
    cancelOrder,
    autoPrintEnabled
  } = useAttendant();

  const { 
    printOrder, 
    isPrinting, 
    printQueue, 
    printHistory, 
    retryPrint, 
    clearQueue 
  } = useThermalPrint();
  
  // ✅ FASE 3: Hook de som configurável
  const { 
    settings: soundSettings, 
    playNewOrderSound, 
    toggleSound: toggleSoundHook 
  } = useSound();

  const [activeTab, setActiveTab] = useState('novos');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPrintQueue, setShowPrintQueue] = useState(false);
  const [showPendingPayments, setShowPendingPayments] = useState(false);
  const [showMessagesHub, setShowMessagesHub] = useState(false);
  
  // Filtros
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  
  const previousPendingCount = useRef(0);

  // ✅ FASE 3: Query para contar pagamentos pendentes
  const { data: pendingPaymentsCount } = useQuery({
    queryKey: ['pending-payments-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending_payment')
        .neq('status', 'cancelled');
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  // Query para contar mensagens não lidas
  const { data: unreadMessagesCount } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('order_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'customer')
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 10000, // Atualiza a cada 10s
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  // Filtrar pedidos com base na busca
  const filteredOrders = orders?.filter(order => {
    // Filtro de busca
    const matchesSearch = searchQuery === "" || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery);
    
    // Filtro de método de pagamento
    const matchesPayment = paymentMethodFilter === "all" || 
      order.payment_method === paymentMethodFilter;
    
    return matchesSearch && matchesPayment;
  }) || [];

  // Separar pedidos por categoria seguindo padrão WABiz
  // ✅ NOVOS: Apenas pedidos recém-confirmados ou pendentes
  const novosOrders = filteredOrders.filter(o => {
    return o.status === 'pending' || o.status === 'confirmed';
  });
  
  // ✅ EM ANDAMENTO: Todas as etapas de preparo, retirada e entrega
  const emAndamentoOrders = filteredOrders.filter(o => {
    return o.status === 'preparing' || o.status === 'ready' || o.status === 'in_delivery';
  });
  
  // ✅ FINALIZADOS: Apenas pedidos concluídos ou cancelados
  const finalizadosOrders = filteredOrders.filter(o => {
    return o.status === 'delivered' || o.status === 'cancelled';
  });
  
  // ✅ FASE 3: Tocar som configurável quando novo pedido chega
  useEffect(() => {
    const currentPending = novosOrders.length;
    
    if (soundSettings.enabled && currentPending > previousPendingCount.current && previousPendingCount.current > 0) {
      playNewOrderSound();
      toast.info("🔔 Novo pedido recebido!");
    }
    
    previousPendingCount.current = currentPending;
  }, [novosOrders.length, soundSettings.enabled, playNewOrderSound]);

  // Ações do modal
  const handleOrderAction = async (action: string, orderId: string) => {
    try {
      switch (action) {
        case 'confirm':
          await confirmOrder(orderId);
          break;
        case 'startPreparation':
          await startPreparation(orderId);
          break;
        case 'markReady':
          const order = filteredOrders.find(o => o.id === orderId);
          await markReady(orderId, order?.delivery_method || 'delivery');
          break;
        case 'markPickedUp':
          await markPickedUp(orderId);
          break;
        case 'markInDelivery':
          await markInDelivery(orderId);
          break;
        case 'markDelivered':
          await markDelivered(orderId);
          break;
        case 'cancel':
          await cancelOrder(orderId);
          break;
        case 'print':
          await printOrder(orderId);
          toast.success('Pedido enviado para impressão');
          break;
      }
      handleCloseDetails();
    } catch (error) {
      console.error('Erro ao executar ação:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header WABiz */}
        <WABizHeader
          onRefresh={refreshData}
          onSearch={handleSearch}
          notificationCount={stats?.pending_orders || 0}
          pendingPaymentsCount={pendingPaymentsCount || 0}
          unreadMessagesCount={unreadMessagesCount || 0}
          onOpenPendingPayments={() => setShowPendingPayments(true)}
          onOpenPrintQueue={() => setShowPrintQueue(true)}
          onOpenMessages={() => setShowMessagesHub(true)}
        />

      {/* Badge de Impressão Automática */}
      {autoPrintEnabled && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3">
          <Badge variant="outline" className="gap-2 bg-white border-green-300 text-green-700">
            <Printer className="h-3 w-3" />
            Impressão automática ativa - pedidos confirmados serão impressos automaticamente
          </Badge>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="p-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Navegação por Abas - Estilo WABiz */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200 shadow-sm">
              <TabsTrigger 
                value="novos" 
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white font-medium"
              >
                NOVOS ({novosOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="em-andamento"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white font-medium"
              >
                EM ANDAMENTO ({emAndamentoOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="finalizados"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white font-medium"
              >
                FINALIZADOS ({finalizadosOrders.length})
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo das Abas */}
            <TabsContent value="novos" className="mt-6">
              <WABizOrdersTable
                orders={novosOrders}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="em-andamento" className="mt-6">
              <WABizOrdersTable
                orders={emAndamentoOrders}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="finalizados" className="mt-6">
              <WABizOrdersTable
                orders={finalizadosOrders}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Botões de ação flutuantes */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* Botão de Fila de Impressão */}
        {printQueue.length > 0 && (
          <Button
            variant="default"
            size="lg"
            onClick={() => setShowPrintQueue(true)}
            className="shadow-lg animate-pulse"
          >
            <Printer className="h-5 w-5 mr-2" />
            Fila ({printQueue.length})
          </Button>
        )}
        
        {/* Botão de Reimprimir (se tiver pedido selecionado) */}
        {selectedOrder && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleOrderAction('print', selectedOrder.id)}
            disabled={isPrinting}
            className="shadow-lg"
          >
            <Printer className="h-5 w-5 mr-2" />
            {isPrinting ? 'Imprimindo...' : 'Reimprimir'}
          </Button>
        )}
      </div>
      
      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <StripeOrderModal
          order={selectedOrder}
          onClose={handleCloseDetails}
          onConfirmOrder={() => handleOrderAction('confirm', selectedOrder?.id)}
          onStartPreparation={() => handleOrderAction('startPreparation', selectedOrder?.id)}
          onMarkReady={(orderId) => handleOrderAction('markReady', orderId)}
          onMarkPickedUp={() => handleOrderAction('markPickedUp', selectedOrder?.id)}
          onMarkInDelivery={() => handleOrderAction('markInDelivery', selectedOrder?.id)}
          onMarkDelivered={() => handleOrderAction('markDelivered', selectedOrder?.id)}
          onCancelOrder={() => handleOrderAction('cancel', selectedOrder?.id)}
        />
      )}
      
      {/* ✅ FASE 3: Modal de Fila de Impressão */}
      {showPrintQueue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Fila de Impressão</h2>
              <Button variant="ghost" onClick={() => setShowPrintQueue(false)}>
                Fechar
              </Button>
            </div>
            <ThermalPrintQueue
              queue={printQueue}
              onRetry={retryPrint}
              onClear={clearQueue}
            />
          </div>
        </div>
      )}
      
      {/* ✅ FASE 3: Modal de Pagamentos Pendentes */}
      <PendingPaymentModal
        isOpen={showPendingPayments}
        onClose={() => setShowPendingPayments(false)}
        onViewDetails={(orderId) => {
          const order = orders?.find(o => o.id === orderId);
          if (order) {
            handleViewDetails(order);
          }
        }}
      />

      {/* Hub de Mensagens */}
      <MessagesHub 
        isOpen={showMessagesHub}
        onClose={() => setShowMessagesHub(false)}
        onOpenOrder={(orderId) => {
          const order = orders?.find(o => o.id === orderId);
          if (order) {
            setSelectedOrder(order);
            setShowMessagesHub(false);
          }
        }}
      />
      </div>
    </>
  );
}