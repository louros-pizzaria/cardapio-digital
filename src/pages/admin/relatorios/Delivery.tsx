import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Truck, Clock, MapPin, TrendingUp, AlertCircle } from 'lucide-react';

const deliveryStats = [
  { label: 'Tempo Médio', value: '28 min', icon: Clock, color: 'text-blue-500' },
  { label: 'Entregas no Prazo', value: '94.5%', icon: TrendingUp, color: 'text-green-500' },
  { label: 'Entregas Atrasadas', value: '5.5%', icon: AlertCircle, color: 'text-red-500' },
  { label: 'Distância Média', value: '3.2 km', icon: MapPin, color: 'text-purple-500' },
];

const neighborhoods = [
  { 
    name: 'Centro', 
    deliveries: 234, 
    avgTime: '25 min',
    onTimeRate: 96.2,
    fee: 'R$ 5,00'
  },
  { 
    name: 'Jardim América', 
    deliveries: 189, 
    avgTime: '28 min',
    onTimeRate: 94.7,
    fee: 'R$ 7,00'
  },
  { 
    name: 'Vila Nova', 
    deliveries: 156, 
    avgTime: '32 min',
    onTimeRate: 91.0,
    fee: 'R$ 8,00'
  },
  { 
    name: 'São José', 
    deliveries: 143, 
    avgTime: '30 min',
    onTimeRate: 93.0,
    fee: 'R$ 6,00'
  },
  { 
    name: 'Bela Vista', 
    deliveries: 98, 
    avgTime: '35 min',
    onTimeRate: 88.8,
    fee: 'R$ 10,00'
  },
];

const timeRanges = [
  { range: '0-20 min', count: 234, percentage: 28.7 },
  { range: '21-30 min', count: 456, percentage: 55.9 },
  { range: '31-40 min', count: 98, percentage: 12.0 },
  { range: '41-60 min', count: 23, percentage: 2.8 },
  { range: '60+ min', count: 5, percentage: 0.6 },
];

export default function Delivery() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select defaultValue="30days">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="90days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {deliveryStats.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 bg-secondary rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Distribuição de Tempo */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Distribuição de Tempo de Entrega</h3>
        <div className="space-y-4">
          {timeRanges.map((range, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{range.range}</span>
                  <Badge variant="outline">{range.count} entregas</Badge>
                </div>
                <span className="text-sm font-bold">{range.percentage}%</span>
              </div>
              <Progress value={range.percentage} className="h-2" />
            </div>
          ))}
        </div>
      </Card>

      {/* Performance por Bairro */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance por Bairro</h3>
        <div className="space-y-4">
          {neighborhoods.map((neighborhood, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold">{neighborhood.name}</h4>
                  <Badge variant="outline">{neighborhood.deliveries} entregas</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Tempo médio: <strong className="text-foreground">{neighborhood.avgTime}</strong></span>
                  <span>•</span>
                  <span>No prazo: <strong className={neighborhood.onTimeRate >= 90 ? 'text-green-500' : 'text-red-500'}>{neighborhood.onTimeRate}%</strong></span>
                  <span>•</span>
                  <span>Taxa: <strong className="text-foreground">{neighborhood.fee}</strong></span>
                </div>
                <div className="mt-2">
                  <Progress value={neighborhood.onTimeRate} className="h-1.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Gráfico de Entregas por Hora */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Entregas por Hora do Dia</h3>
        <div className="h-64 flex items-end justify-between gap-2">
          {[8, 12, 18, 28, 45, 67, 89, 95, 88, 76, 54, 32].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-primary rounded-t transition-all hover:opacity-80"
                style={{ height: `${height * 2}px` }}
              />
              <span className="text-xs text-muted-foreground">
                {i + 11}h
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
