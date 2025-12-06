import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Server, 
  HardDrive, 
  Cpu, 
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const services = [
  { name: 'API Principal', status: 'operational', uptime: '99.99%', responseTime: '45ms' },
  { name: 'Banco de Dados', status: 'operational', uptime: '99.97%', responseTime: '12ms' },
  { name: 'Sistema de Pagamentos', status: 'operational', uptime: '99.95%', responseTime: '230ms' },
  { name: 'Notificações', status: 'degraded', uptime: '98.50%', responseTime: '890ms' },
  { name: 'Storage', status: 'operational', uptime: '100%', responseTime: '67ms' },
];

const getStatusBadge = (status: string) => {
  const config = {
    operational: { 
      label: 'Operacional', 
      variant: 'default' as const, 
      icon: CheckCircle,
      className: 'bg-green-500' 
    },
    degraded: { 
      label: 'Degradado', 
      variant: 'outline' as const, 
      icon: AlertTriangle,
      className: 'text-yellow-500 border-yellow-500' 
    },
    down: { 
      label: 'Fora do ar', 
      variant: 'destructive' as const, 
      icon: AlertTriangle,
      className: '' 
    },
  };
  return config[status as keyof typeof config] || config.operational;
};

export default function Status() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Status do Sistema</h2>
        <p className="text-muted-foreground">
          Monitoramento em tempo real da infraestrutura
        </p>
      </div>

      {/* Status Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Geral</p>
              <p className="text-lg font-bold">Operacional</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uptime (30d)</p>
              <p className="text-lg font-bold">99.96%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tempo de Resposta</p>
              <p className="text-lg font-bold">89ms</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Server className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requisições (24h)</p>
              <p className="text-lg font-bold">124.5k</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Serviços */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Status dos Serviços</h3>
        <div className="space-y-4">
          {services.map((service, index) => {
            const statusConfig = getStatusBadge(service.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <StatusIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{service.name}</span>
                    <Badge variant={statusConfig.variant} className={statusConfig.className}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Uptime: <strong>{service.uptime}</strong></span>
                    <span>Resposta: <strong>{service.responseTime}</strong></span>
                  </div>
                </div>
                {index < services.length - 1 && <Separator className="mt-4" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recursos do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Cpu className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPU</p>
              <p className="text-2xl font-bold">34%</p>
            </div>
          </div>
          <Progress value={34} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">8 de 16 cores em uso</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Database className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Memória</p>
              <p className="text-2xl font-bold">58%</p>
            </div>
          </div>
          <Progress value={58} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">23.2GB de 32GB em uso</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <HardDrive className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Armazenamento</p>
              <p className="text-2xl font-bold">42%</p>
            </div>
          </div>
          <Progress value={42} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">420GB de 1TB em uso</p>
        </Card>
      </div>
    </div>
  );
}
