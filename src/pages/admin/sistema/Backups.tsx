import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Database, 
  Download, 
  RefreshCw, 
  Clock,
  HardDrive,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const getStatusBadge = (status: string) => {
  return status === 'success' 
    ? { icon: CheckCircle, label: 'Sucesso', variant: 'default' as const, className: 'bg-green-500' }
    : { icon: AlertCircle, label: 'Falhou', variant: 'destructive' as const, className: '' };
};

export default function Backups() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      // Por enquanto, retornar vazio até implementar sistema de backups
      setBackups([]);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
      toast.error('Erro ao carregar backups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    toast.info('Sistema de backup em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Backups do Sistema</h2>
          <p className="text-muted-foreground">
            Gerencie backups e restaurações
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Criar Backup Manual
        </Button>
      </div>

      {/* Status do Backup */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Último Backup</p>
              <p className="text-lg font-bold">23/10 22:00</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <HardDrive className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Armazenado</p>
              <p className="text-lg font-bold">1.2 GB</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frequência</p>
              <p className="text-lg font-bold">Diária</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retenção</p>
              <p className="text-lg font-bold">30 dias</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Configurações de Backup */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Configurações Automáticas</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-backup">Backups automáticos</Label>
              <p className="text-sm text-muted-foreground">
                Criar backups automaticamente conforme programação
              </p>
            </div>
            <Switch id="auto-backup" defaultChecked />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select defaultValue="daily">
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">A cada hora</SelectItem>
                  <SelectItem value="daily">Diariamente</SelectItem>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                  <SelectItem value="monthly">Mensalmente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention">Período de retenção</Label>
              <Select defaultValue="30">
                <SelectTrigger id="retention">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="permanent">Permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button>Salvar Configurações</Button>
          </div>
        </div>
      </Card>

      {/* Lista de Backups */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Backups Recentes</h3>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Retenção</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando backups...
                </TableCell>
              </TableRow>
            ) : backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum backup encontrado. Sistema em desenvolvimento.
                </TableCell>
              </TableRow>
            ) : backups.map((backup) => {
              const statusConfig = getStatusBadge(backup.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <TableRow key={backup.id}>
                  <TableCell className="font-medium">{backup.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{backup.type}</Badge>
                  </TableCell>
                  <TableCell>{backup.size}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant} className={statusConfig.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{backup.retention}</TableCell>
                  <TableCell>
                    {backup.status === 'success' && (
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
