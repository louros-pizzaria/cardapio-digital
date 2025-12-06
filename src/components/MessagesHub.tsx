// ===== CENTRAL DE MENSAGENS - HUB DE CONVERSAS =====

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessagesHubProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrder?: (orderId: string) => void;
}

interface OrderWithMessages {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  order_status: string;
}

export const MessagesHub = ({ isOpen, onClose, onOpenOrder }: MessagesHubProps) => {
  const [conversations, setConversations] = useState<OrderWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    fetchConversations();
    const cleanup = setupRealtime();
    return () => {
      // Garantir cleanup do canal ao fechar
      if (typeof cleanup === 'function') cleanup();
    };
  }, [isOpen]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Buscar todas as conversas ativas (últimas 48h)
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

      const { data, error } = await supabase
        .from('order_messages')
        .select(`
          order_id,
          message,
          created_at,
          is_read,
          sender_type,
          orders (
            customer_name,
            customer_phone,
            status
          )
        `)
        .gte('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar mensagens por pedido
      const grouped = new Map<string, OrderWithMessages>();
      
      (data || []).forEach((msg: any) => {
        if (!msg.orders) return;
        
        const orderId = msg.order_id;
        
        if (!grouped.has(orderId)) {
          grouped.set(orderId, {
            order_id: orderId,
            customer_name: msg.orders.customer_name,
            customer_phone: msg.orders.customer_phone,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: 0,
            order_status: msg.orders.status
          });
        }
        
        // Contar mensagens não lidas do cliente
        if (msg.sender_type === 'customer' && !msg.is_read) {
          grouped.get(orderId)!.unread_count++;
        }
      });

      setConversations(Array.from(grouped.values()));
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('messages-hub')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_messages'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredConversations = conversations.filter(conv => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.customer_name.toLowerCase().includes(searchLower) ||
      conv.customer_phone.includes(searchQuery) ||
      conv.order_id.toLowerCase().includes(searchLower)
    );
  });

  const unreadConversations = filteredConversations.filter(c => c.unread_count > 0);
  const readConversations = filteredConversations.filter(c => c.unread_count === 0);

  const handleOpenChat = (orderId: string) => {
    if (onOpenOrder) {
      onOpenOrder(orderId);
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Central de Mensagens
          </SheetTitle>
          <SheetDescription>
            {conversations.length} conversas ativas
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando conversas...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Não lidas */}
                {unreadConversations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-red-600">
                      Não lidas ({unreadConversations.length})
                    </h3>
                    <div className="space-y-2">
                      {unreadConversations.map((conv) => (
                        <Button
                          key={conv.order_id}
                          variant="outline"
                          className="w-full h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent"
                          onClick={() => handleOpenChat(conv.order_id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{conv.customer_name}</span>
                              <Badge variant="destructive" className="h-5">
                                {conv.unread_count}
                              </Badge>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              #{conv.order_id.slice(0, 8)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground text-left line-clamp-1 w-full">
                            {conv.last_message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(conv.last_message_time), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lidas */}
                {readConversations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Conversas recentes
                    </h3>
                    <div className="space-y-2">
                      {readConversations.map((conv) => (
                        <Button
                          key={conv.order_id}
                          variant="ghost"
                          className="w-full h-auto p-4 flex flex-col items-start gap-2 opacity-70"
                          onClick={() => handleOpenChat(conv.order_id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{conv.customer_name}</span>
                            <Badge variant="outline" className="text-xs">
                              #{conv.order_id.slice(0, 8)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground text-left line-clamp-1 w-full">
                            {conv.last_message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(conv.last_message_time), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
