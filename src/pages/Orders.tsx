
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Search, Clock, Eye, Truck, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useUnifiedAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's orders with complete information
  const { data: orders, isLoading: loading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (name, image_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      console.log('[ORDERS] 📊 Pedidos carregados:', {
        total: data?.length || 0,
        com_snapshot: data?.filter(o => o.delivery_address_snapshot).length || 0,
        sem_snapshot: data?.filter(o => !o.delivery_address_snapshot).length || 0,
      });
      
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', color: 'bg-yellow-500' },
      confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
      preparing: { label: 'Preparando', color: 'bg-orange-500' },
      out_for_delivery: { label: 'Em Entrega', color: 'bg-purple-500' },
      delivered: { label: 'Entregue', color: 'bg-green-500' },
      cancelled: { label: 'Cancelado', color: 'bg-red-500' }
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Format address for display - ALWAYS use snapshot
  const formatAddress = (order: any) => {
    if (order.delivery_method === 'Retirada') {
      return 'Rei da Pizza d Paraty Delivery - Paraty';
    }
    
    const addr = order.delivery_address_snapshot;
    
    if (!addr) return 'Endereço não disponível';
    
    return `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city}`;
  };

  const getDeliveryIcon = (order: any) => {
    return order.delivery_method === 'Retirada' ? Store : Truck;
  };

  const filteredOrders = orders?.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const addr = order.delivery_address_snapshot as any;
    return order.id.toLowerCase().includes(searchLower) ||
           (addr && typeof addr === 'object' && addr.neighborhood?.toLowerCase().includes(searchLower));
  }) || [];

  // Separar em andamento e finalizados
  const inProgressOrders = filteredOrders.filter(o => 
    ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
  );
  const completedOrders = filteredOrders.filter(o => 
    ['delivered', 'completed', 'cancelled'].includes(o.status)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pizza-red mx-auto mb-4"></div>
          <p>Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto">
              <h1 className="text-xl font-semibold">Meus Pedidos</h1>
            </div>
          </header>
          <div className="flex-1 bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <p className="text-muted-foreground">
                  Acompanhe o status e histórico dos seus pedidos
                </p>
              </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por número do pedido ou bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {orders.length === 0 ? 'Que tal fazer seu primeiro pedido?' : 'Tente ajustar a busca'}
              </p>
              {orders.length === 0 && (
                <Button onClick={() => navigate('/menu')} className="gradient-pizza">
                  Ver Menu
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Em Andamento */}
            {inProgressOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-700">Em Andamento</h2>
                <div className="space-y-4">
                  {inProgressOrders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    return (
                      <Card key={order.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-medium">Pedido #{order.order_number}</h3>
                                <Badge className={`${statusInfo.color} text-white`}>
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <div>📅 {new Date(order.created_at).toLocaleString('pt-BR')}</div>
                                <div className="flex items-center gap-1.5">
                                  {(() => {
                                    const Icon = getDeliveryIcon(order);
                                    return <Icon className="h-4 w-4" />;
                                  })()}
                                  <span>
                                    {order.delivery_method === 'pickup' ? 'Retirada: ' : 'Delivery: '}
                                    {formatAddress(order)}
                                  </span>
                                </div>
                                <div>🍕 {order.order_items?.length || 0} itens</div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-pizza-red">
                                  {formatPrice(order.total_amount)}
                                </div>
                              </div>
                              <Button
                                onClick={() => navigate(`/order-status/${order.id}`)}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver Detalhes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Finalizados */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-700">Finalizados</h2>
                <div className="space-y-4">
                  {completedOrders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    return (
                      <Card key={order.id} className="hover:shadow-md transition-shadow opacity-75">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-medium">Pedido #{order.order_number}</h3>
                                <Badge className={`${statusInfo.color} text-white`}>
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <div>📅 {new Date(order.created_at).toLocaleString('pt-BR')}</div>
                                <div className="flex items-center gap-1.5">
                                  {(() => {
                                    const Icon = getDeliveryIcon(order);
                                    return <Icon className="h-4 w-4" />;
                                  })()}
                                  <span>
                                    {order.delivery_method === 'pickup' ? 'Retirada: ' : 'Delivery: '}
                                    {formatAddress(order)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-600">
                                  {formatPrice(order.total_amount)}
                                </div>
                              </div>
                              <Button
                                onClick={() => navigate(`/order-status/${order.id}`)}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver Detalhes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Orders;
