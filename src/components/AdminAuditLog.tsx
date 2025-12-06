import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, ShoppingBag, Package, Store, User, Clock, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminActionLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface StoreStatusLog {
  id: string;
  changed_by: string;
  is_open: boolean;
  reason: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const getActionIcon = (entityType: string) => {
  switch (entityType) {
    case 'product': return <Package className="h-4 w-4" />;
    case 'order': return <ShoppingBag className="h-4 w-4" />;
    case 'store': return <Store className="h-4 w-4" />;
    case 'user': return <User className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    'product_paused': 'Produto Pausado',
    'product_pause_ended': 'Pausa Finalizada',
    'product_updated': 'Produto Atualizado',
    'order_confirmed': 'Pedido Confirmado',
    'order_cancelled': 'Pedido Cancelado',
    'store_opened': 'Loja Aberta',
    'store_closed': 'Loja Fechada',
  };
  return labels[action] || action;
};

export const AdminAuditLog = () => {
  const [adminLogs, setAdminLogs] = useState<AdminActionLog[]>([]);
  const [storeLogs, setStoreLogs] = useState<StoreStatusLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Buscar logs de ações do admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (adminError) throw adminError;

      // Buscar perfis dos admins
      if (adminData && adminData.length > 0) {
        const adminIds = [...new Set(adminData.map(log => log.admin_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', adminIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        setAdminLogs(adminData.map(log => ({
          ...log,
          profiles: profilesMap.get(log.admin_id)
        })) as AdminActionLog[]);
      } else {
        setAdminLogs([]);
      }

      // Buscar logs de status da loja
      const { data: storeData, error: storeError } = await supabase
        .from('store_status_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (storeError) throw storeError;

      // Buscar perfis dos que alteraram status
      if (storeData && storeData.length > 0) {
        const changedByIds = [...new Set(storeData.map(log => log.changed_by))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', changedByIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        setStoreLogs(storeData.map(log => ({
          ...log,
          profiles: profilesMap.get(log.changed_by)
        })) as StoreStatusLog[]);
      } else {
        setStoreLogs([]);
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Auditoria e Histórico</CardTitle>
          <CardDescription>Carregando logs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <div>
            <CardTitle>Auditoria e Histórico</CardTitle>
            <CardDescription>Registro completo de ações administrativas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin">
              <Activity className="h-4 w-4 mr-2" />
              Ações do Admin ({adminLogs.length})
            </TabsTrigger>
            <TabsTrigger value="store">
              <Store className="h-4 w-4 mr-2" />
              Status da Loja ({storeLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admin" className="mt-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {adminLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum log de ação encontrado
                  </p>
                ) : (
                  adminLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="mt-1 p-2 rounded-full bg-primary/10">
                        {getActionIcon(log.entity_type)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                          <Badge variant="secondary" className="capitalize">
                            {log.entity_type}
                          </Badge>
                        </div>
                        
                        <p className="text-sm">
                          <span className="font-medium">{log.profiles?.full_name || 'Admin'}</span>
                          {' realizou uma ação'}
                        </p>
                        
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="store" className="mt-4">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {storeLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum log de status encontrado
                  </p>
                ) : (
                  storeLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className={`mt-1 p-2 rounded-full ${log.is_open ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                        <Store className={`h-4 w-4 ${log.is_open ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.is_open ? "default" : "destructive"}>
                            {log.is_open ? 'Loja Aberta' : 'Loja Fechada'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm">
                          <span className="font-medium">{log.profiles?.full_name || 'Admin'}</span>
                          {log.is_open ? ' abriu a loja' : ' fechou a loja'}
                        </p>
                        
                        {log.reason && (
                          <p className="text-sm text-muted-foreground">
                            Motivo: {log.reason}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};