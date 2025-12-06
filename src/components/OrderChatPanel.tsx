import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useOrderChat } from '@/hooks/useOrderChat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderChatPanelProps {
  orderId: string;
  customerName?: string;
  isCustomerView?: boolean;
}

export const OrderChatPanel = ({ orderId, customerName, isCustomerView = false }: OrderChatPanelProps) => {
  // Validação adicional no início
  if (!orderId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando chat...</p>
      </div>
    );
  }

  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const senderType = isCustomerView ? 'customer' : 'attendant';
  const { messages, loading, sending, unreadCount, sendMessage, markAsRead } = useOrderChat(orderId, senderType);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marcar como lidas quando abrir o chat
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    await sendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[500px] border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/50">
        <MessageCircle className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {isCustomerView 
              ? `Chat com ${customerName || 'Atendente'}` 
              : `Chat com ${customerName || 'Cliente'}`
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unreadCount} nova{unreadCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma mensagem ainda.</p>
              <p className="text-xs mt-1">Envie a primeira mensagem para o cliente!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAttendant = isCustomerView 
                ? msg.sender_type === 'customer'
                : msg.sender_type === 'attendant';
              const isSystem = msg.sender_type === 'system';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isAttendant ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isSystem
                        ? 'bg-muted text-muted-foreground text-center w-full'
                        : isAttendant
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {!isSystem && (
                      <p className="text-xs opacity-70 mb-1">
                        {isAttendant ? 'Você' : customerName || 'Cliente'}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_at), "HH:mm 'de' dd/MM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-muted/50">
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 px-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Enviando mensagem...</span>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            size="icon"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
