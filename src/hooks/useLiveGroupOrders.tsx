import { useState, useEffect, useRef } from 'react';
import { useUnifiedAuth } from './useUnifiedAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupOrder {
  id: string;
  host_id: string;
  name: string;
  status: 'active' | 'closed' | 'confirmed';
  participants: GroupParticipant[];
  total_amount: number;
  delivery_address?: any;
  created_at: string;
  expires_at: string;
}

interface GroupParticipant {
  id: string;
  user_id: string;
  name: string;
  items: any[];
  total: number;
  status: 'selecting' | 'confirmed' | 'paid';
  joined_at: string;
}

interface GroupOrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: any;
  added_by: string;
}

export const useLiveGroupOrders = () => {
  const { user } = useUnifiedAuth();
  const [activeGroup, setActiveGroup] = useState<GroupOrder | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [myItems, setMyItems] = useState<GroupOrderItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  // Subscribe to real-time updates
  useEffect(() => {
    if (activeGroup && user) {
      subscribeToGroupUpdates();
    }
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [activeGroup, user]);

  const subscribeToGroupUpdates = () => {
    if (!activeGroup || !user) return;

    setConnectionStatus('connecting');
    
    channelRef.current = supabase
      .channel(`group_order_${activeGroup.id}`)
      .on('presence', { event: 'sync' }, () => {
        setConnectionStatus('connected');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined group:', key, newPresences);
        toast({
          title: "Novo participante",
          description: `${newPresences[0].name} entrou no pedido em grupo!`
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left group:', key, leftPresences);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_orders',
        filter: `id=eq.${activeGroup.id}`
      }, (payload) => {
        handleGroupUpdate(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_order_items',
        filter: `group_order_id=eq.${activeGroup.id}`
      }, (payload) => {
        handleItemUpdate(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence();
        }
      });
  };

  const trackPresence = async () => {
    if (!channelRef.current || !user) return;

    await channelRef.current.track({
      user_id: user.id,
        name: 'Usuário',
      status: 'active',
      last_seen: new Date().toISOString()
    });
  };

  const createGroupOrder = async (groupName: string, deliveryAddress?: any) => {
    if (!user) return null;

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours from now

      // Mock implementation - replace with actual supabase calls when types are ready
      const mockGroup = {
        id: Math.random().toString(36).substr(2, 9),
        host_id: user.id,
        name: groupName,
        status: 'active' as const,
        participants: [],
        total_amount: 0,
        delivery_address: deliveryAddress,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };
      
      setActiveGroup(mockGroup);
      setIsHost(true);
      toast({
        title: "Pedido em grupo criado!",
        description: `Compartilhe o código: ${mockGroup.id.slice(-6).toUpperCase()}`
      });
      return mockGroup;
    } catch (error) {
      console.error('Error creating group order:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o pedido em grupo.",
        variant: "destructive"
      });
    }
    return null;
  };

  const joinGroupOrder = async (groupId: string) => {
    if (!user) return false;

    try {
      // First, check if group exists and is active
      const { data: group, error: groupError } = await supabase
        .from('group_orders')
        .select('*')
        .eq('id', groupId)
        .eq('status', 'active')
        .single();

      if (!group || groupError) {
        toast({
          title: "Grupo não encontrado",
          description: "Verifique o código e tente novamente.",
          variant: "destructive"
        });
        return false;
      }

      // Add participant
      const { data, error } = await supabase
        .from('group_order_participants')
        .insert({
          group_order_id: groupId,
          user_id: user.id,
          name: 'Usuário',
          status: 'selecting'
        })
        .select()
        .single();

      if (data && !error) {
        // Cast to GroupOrder with participants array
        const groupWithParticipants: GroupOrder = {
          ...group,
          status: group.status as 'active' | 'closed' | 'confirmed',
          participants: []
        };
        setActiveGroup(groupWithParticipants);
        setIsHost(group.host_id === user.id);
        toast({
          title: "Conectado ao grupo!",
          description: `Você entrou no pedido "${group.name}"`
        });
        return true;
      }
    } catch (error) {
      console.error('Error joining group order:', error);
      toast({
        title: "Erro",
        description: "Não foi possível entrar no grupo.",
        variant: "destructive"
      });
    }
    return false;
  };

  const addItemToGroup = async (item: Omit<GroupOrderItem, 'added_by'>) => {
    if (!activeGroup || !user) return;

    try {
      // Mock implementation - add item locally
      setMyItems(prev => [...prev, { ...item, added_by: user.id }]);
      toast({
        title: "Item adicionado!",
        description: `${item.name} foi adicionado ao seu pedido.`
      });
    } catch (error) {
      console.error('Error adding item to group:', error);
    }
  };

  const removeItemFromGroup = async (itemId: string) => {
    if (!activeGroup) return;

    try {
      // Mock implementation - remove item locally
      setMyItems(prev => prev.filter(item => item.product_id !== itemId));
      toast({
        title: "Item removido!",
        description: "Item foi removido do seu pedido."
      });
    } catch (error) {
      console.error('Error removing item from group:', error);
    }
  };

  const confirmMyOrder = async () => {
    if (!activeGroup || !user) return;

    try {
      // Mock implementation
      toast({
        title: "Pedido confirmado!",
        description: "Aguarde os outros participantes confirmarem."
      });
    } catch (error) {
      console.error('Error confirming order:', error);
    }
  };

  const finalizeGroupOrder = async () => {
    if (!activeGroup || !isHost) return;

    try {
      // Mock implementation
      toast({
        title: "Pedido finalizado!",
        description: "Todos os pedidos individuais foram criados."
      });
    } catch (error) {
      console.error('Error finalizing group order:', error);
    }
  };

  const createIndividualOrders = async () => {
    // Mock implementation for now
    console.log('Creating individual orders for group:', activeGroup?.name);
  };

  const leaveGroup = async () => {
    if (!activeGroup || !user) return;

    try {
      // Mock implementation
      setActiveGroup(null);
      setIsHost(false);
      setMyItems([]);
      setParticipants([]);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      toast({
        title: "Você saiu do grupo",
        description: "Pedido em grupo finalizado."
      });
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleGroupUpdate = (payload: any) => {
    if (payload.eventType === 'UPDATE') {
      setActiveGroup(prev => prev ? { ...prev, ...payload.new } : null);
    }
  };

  const handleItemUpdate = (payload: any) => {
    // Update local items based on real-time changes
    if (payload.eventType === 'INSERT') {
      if (payload.new.user_id === user?.id) {
        setMyItems(prev => [...prev, payload.new]);
      }
    } else if (payload.eventType === 'DELETE') {
      if (payload.old.user_id === user?.id) {
        setMyItems(prev => prev.filter(item => item.product_id !== payload.old.product_id));
      }
    }
  };

  const calculateGroupTotal = () => {
    return myItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getShareableLink = () => {
    if (!activeGroup) return '';
    return `${window.location.origin}/group-order/${activeGroup.id}`;
  };

  return {
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
  };
};