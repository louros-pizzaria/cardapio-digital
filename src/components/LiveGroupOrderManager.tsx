import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Plus, 
  Minus, 
  Share2, 
  Clock, 
  ShoppingCart,
  Check,
  Crown,
  Copy,
  MessageSquare,
  Zap,
  X,
  DollarSign
} from 'lucide-react';
import { useLiveGroupOrders } from '@/hooks/useLiveGroupOrders';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';

interface LiveGroupOrderManagerProps {
  onClose?: () => void;
  initialMode?: 'create' | 'join' | 'active';
}

const LiveGroupOrderManager: React.FC<LiveGroupOrderManagerProps> = ({
  onClose,
  initialMode = 'create'
}) => {
  const {
    activeGroup,
    isHost,
    participants,
    myItems,
    connectionStatus,
    createGroupOrder,
    joinGroupOrder,
    addItemToGroup,
    removeItemFromGroup,
    confirmMyOrder,
    finalizeGroupOrder,
    leaveGroup,
    calculateGroupTotal,
    getShareableLink
  } = useLiveGroupOrders();

  const { user } = useUnifiedAuth();
  const { haptics } = useHapticFeedback();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<'create' | 'join' | 'active'>(initialMode);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (activeGroup) {
      setMode('active');
    }
  }, [activeGroup]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o pedido em grupo.",
        variant: "destructive"
      });
      return;
    }

    haptics.buttonTap();
    const group = await createGroupOrder(groupName);
    if (group) {
      setShowShareModal(true);
      haptics.orderConfirmed();
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite o código do grupo para entrar.",
        variant: "destructive"
      });
      return;
    }

    haptics.buttonTap();
    const success = await joinGroupOrder(joinCode);
    if (success) {
      haptics.userJoined();
    }
  };

  const handleShareGroup = () => {
    const link = getShareableLink();
    const code = activeGroup?.id.slice(-6).toUpperCase();
    
    const shareText = `🍕 Junte-se ao nosso pedido em grupo!\n\nNome: ${activeGroup?.name}\nCódigo: ${code}\nLink: ${link}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Pedido em Grupo - Pizza Premium',
        text: shareText,
        url: link
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Link copiado!",
        description: "Compartilhe com seus amigos para entrarem no grupo."
      });
    }
    haptics.buttonTap();
  };

  const copyGroupCode = () => {
    const code = activeGroup?.id.slice(-6).toUpperCase();
    navigator.clipboard.writeText(code || '');
    toast({
      title: "Código copiado!",
      description: `Código ${code} copiado para a área de transferência.`
    });
    haptics.buttonTap();
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-red-500';
    }
  };

  const getTimeRemaining = () => {
    if (!activeGroup?.expires_at) return null;
    
    const expires = new Date(activeGroup.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return '⏰ Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `⏱️ ${hours}h ${minutes}m restantes`;
  };

  // Mock menu items for demo
  const menuItems = [
    { id: '1', name: 'Margherita', price: 35.90, description: 'Molho de tomate, mussarela, manjericão' },
    { id: '2', name: 'Pepperoni', price: 42.90, description: 'Molho de tomate, mussarela, pepperoni' },
    { id: '3', name: 'Vegetariana', price: 38.90, description: 'Molho de tomate, mussarela, legumes' },
    { id: '4', name: 'Quattro Formaggi', price: 45.90, description: 'Molho branco, 4 queijos especiais' }
  ];

  if (mode === 'create') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl">Criar Pedido em Grupo</CardTitle>
          <p className="text-gray-600">Convide amigos para pedir juntos!</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome do Grupo</label>
              <Input
                placeholder="Ex: Galera do Trabalho"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                Como Funciona:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Você será o host do grupo</li>
                <li>• Compartilhe o código com amigos</li>
                <li>• Todos escolhem seus pratos</li>
                <li>• Pedidos são sincronizados em tempo real</li>
                <li>• Finalize quando todos confirmarem</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCreateGroup} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
              <Users className="h-4 w-4 mr-2" />
              Criar Grupo
            </Button>
            <Button variant="outline" onClick={() => setMode('join')}>
              Entrar em Grupo
            </Button>
          </div>
          
          {onClose && (
            <Button variant="ghost" onClick={onClose} className="w-full">
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (mode === 'join') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl">Entrar em Grupo</CardTitle>
          <p className="text-gray-600">Digite o código compartilhado pelo host</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Código do Grupo</label>
              <Input
                placeholder="Digite o código de 6 dígitos"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGroup()}
                className="text-center font-mono text-lg"
                maxLength={6}
              />
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                Dicas:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• O código tem 6 caracteres</li>
                <li>• Peça ao criador do grupo para compartilhar</li>
                <li>• Grupos ficam ativos por 2 horas</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleJoinGroup} className="flex-1 bg-gradient-to-r from-green-600 to-blue-600">
              <Users className="h-4 w-4 mr-2" />
              Entrar no Grupo
            </Button>
            <Button variant="outline" onClick={() => setMode('create')}>
              Criar Grupo
            </Button>
          </div>
          
          {onClose && (
            <Button variant="ghost" onClick={onClose} className="w-full">
              Cancelar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (mode === 'active' && activeGroup) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Group Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getConnectionStatusColor()}`}></div>
                </div>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {activeGroup.name}
                    {isHost && <Crown className="h-5 w-5 text-yellow-500" />}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Código: {activeGroup.id.slice(-6).toUpperCase()}</span>
                    <span>{getTimeRemaining()}</span>
                    <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                      {connectionStatus === 'connected' ? 'Conectado' : 'Conectando...'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyGroupCode}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareGroup}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={leaveGroup}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Menu Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Escolher Pratos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {menuItems.map(item => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      R$ {item.price.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const existingItem = myItems.find(i => i.product_id === item.id);
                          if (existingItem && existingItem.quantity > 1) {
                            // Decrease quantity logic would go here
                          } else {
                            removeItemFromGroup(item.id);
                          }
                          haptics.buttonTap();
                        }}
                        disabled={!myItems.find(i => i.product_id === item.id)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium">
                        {myItems.find(i => i.product_id === item.id)?.quantity || 0}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          addItemToGroup({
                            product_id: item.id,
                            name: item.name,
                            price: item.price,
                            quantity: 1
                          });
                          haptics.itemAdded();
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        addItemToGroup({
                          product_id: item.id,
                          name: item.name,
                          price: item.price,
                          quantity: 1
                        });
                        haptics.itemAdded();
                      }}
                      className="text-blue-600"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Group Status */}
          <div className="space-y-6">
            {/* My Order */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Meu Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum item selecionado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-600 ml-2">x{item.quantity}</span>
                        </div>
                        <span className="font-medium">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span>R$ {calculateGroupTotal().toFixed(2)}</span>
                    </div>
                    
                    <Button 
                      onClick={confirmMyOrder} 
                      className="w-full"
                      disabled={myItems.length === 0}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar Meu Pedido
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participantes ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium">{participant.name}</span>
                          {participant.user_id === user?.id && (
                            <Badge variant="secondary" className="ml-2 text-xs">Você</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={participant.status === 'confirmed' ? 'default' : 'secondary'}>
                          {participant.status === 'confirmed' ? 'Confirmado' : 'Escolhendo'}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          R$ {participant.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {isHost && (
                  <Button 
                    onClick={finalizeGroupOrder}
                    className="w-full mt-4 bg-gradient-to-r from-green-600 to-blue-600"
                    disabled={participants.some(p => p.status !== 'confirmed')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar Pedido em Grupo
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LiveGroupOrderManager;