import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, RefreshCw, AlertCircle, Info, CheckCircle } from 'lucide-react';

const getLevelBadge = (level: string) => {
  const config = {
    info: { icon: Info, variant: 'outline' as const, className: 'text-blue-500' },
    warning: { icon: AlertCircle, variant: 'outline' as const, className: 'text-yellow-500' },
    error: { icon: AlertCircle, variant: 'destructive' as const, className: '' },
    success: { icon: CheckCircle, variant: 'default' as const, className: 'text-green-500' },
  };
  return config[level as keyof typeof config] || config.info;
};

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const formattedLogs = data.map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.created_at).toLocaleString('pt-BR'),
        level: 'info',
        module: log.entity_type,
        source: log.entity_type,
        user: log.profiles?.full_name || log.profiles?.email || 'Sistema',
        action: log.action,
        message: `${log.action} - ${log.entity_type}`,
        details: JSON.stringify(log.changes)
      }));
      
      setLogs(formattedLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Logs do Sistema</h2>
          <p className="text-muted-foreground">
            Monitore eventos e atividades do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar logs..."
              className="pl-10"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="expire-orders">Expire Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[100px]">Nível</TableHead>
              <TableHead className="w-[120px]">Origem</TableHead>
              <TableHead>Mensagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            ) : logs.map((log) => {
              const levelConfig = getLevelBadge(log.level);
              const LevelIcon = levelConfig.icon;
              
              return (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant={levelConfig.variant} className={levelConfig.className}>
                      <LevelIcon className="h-3 w-3 mr-1" />
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.source}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.message}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
