import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, Target, Filter } from 'lucide-react';

const segments = [
  {
    name: 'QUENTE - ALTA FREQUENCIA',
    description: '15+ pedidos nos últimos 3 meses',
    count: 67,
    percentage: 13.8,
    avgTicket: 42.0,
    ltv: 1298.50,
    growth: '+27%',
    color: 'text-yellow-500',
  },
  {
    name: 'Frequente - Engajado',
    description: '5-14 pedidos nos últimos 3 meses',
    count: 156,
    percentage: 32.0,
    avgTicket: 38.5,
    ltv: 462.0,
    growth: '+8%',
    color: 'text-blue-500',
  },
  {
    name: 'Ocasional - Potencial',
    description: '2-4 pedidos nos últimos 3 meses',
    count: 189,
    percentage: 38.8,
    avgTicket: 35.0,
    ltv: 120.0,
    growth: '+5%',
    color: 'text-green-500',
  },
  {
    name: 'Novo - Primeiro Pedido',
    description: '1 pedido nos últimos 30 dias',
    count: 75,
    percentage: 15.4,
    avgTicket: 40.0,
    ltv: 40.0,
    growth: '+18%',
    color: 'text-purple-500',
  },
  {
    name: 'Inativos - Risco de Churn',
    description: 'Sem pedidos há mais de 60 dias',
    count: 34,
    percentage: 7.0,
    avgTicket: 36.0,
    ltv: 280.0,
    growth: '-15%',
    color: 'text-red-500',
  },
];

const campaigns = [
  {
    segment: 'VIP - Alta Frequência',
    action: 'Programa de Recompensas Exclusivo',
    roi: '340%',
    status: 'active',
  },
  {
    segment: 'Ocasional - Potencial',
    action: 'Cupom de 15% para 2º Pedido',
    roi: '280%',
    status: 'active',
  },
  {
    segment: 'Inativos - Risco de Churn',
    action: 'Campanha de Reativação',
    roi: '220%',
    status: 'planned',
  },
  {
    segment: 'Novo - Primeiro Pedido',
    action: 'Boas-vindas + Desconto',
    roi: '310%',
    status: 'active',
  },
];

export default function Segmentacao() {
  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Segmentos</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Campanhas Ativas</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ROI Médio</p>
              <p className="text-2xl font-bold">287%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Filter className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clientes Segmentados</p>
              <p className="text-2xl font-bold">521</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Segmentos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Segmentos de Clientes</h3>
          <Button size="sm">
            <Target className="h-4 w-4 mr-2" />
            Criar Segmento
          </Button>
        </div>

        <div className="space-y-4">
          {segments.map((segment, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className={`font-semibold ${segment.color}`}>
                        {segment.name}
                      </h4>
                      <Badge variant={segment.growth.startsWith('+') ? 'default' : 'destructive'}>
                        {segment.growth}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {segment.description}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ver Clientes
                  </Button>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Clientes</p>
                    <p className="text-xl font-bold">{segment.count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">% do Total</p>
                    <p className="text-xl font-bold">{segment.percentage}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
                    <p className="text-xl font-bold">R$ {segment.avgTicket.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">LTV</p>
                    <p className="text-xl font-bold">R$ {segment.ltv.toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <Progress value={segment.percentage} className="h-2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Campanhas por Segmento */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Campanhas por Segmento</h3>
        <div className="space-y-3">
          {campaigns.map((campaign, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-medium">{campaign.segment}</p>
                  <Badge variant={campaign.status === 'active' ? 'default' : 'outline'}>
                    {campaign.status === 'active' ? 'Ativa' : 'Planejada'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{campaign.action}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-xl font-bold text-green-500">{campaign.roi}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
