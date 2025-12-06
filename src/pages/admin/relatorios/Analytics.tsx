import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign,
  ArrowUp,
  ArrowDown,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const stats = [
  { 
    label: 'Receita Total', 
    value: 'R$ 45.280', 
    change: '+12.5%', 
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-500'
  },
  { 
    label: 'Pedidos', 
    value: '1.249', 
    change: '+8.2%', 
    trend: 'up',
    icon: ShoppingCart,
    color: 'text-blue-500'
  },
  { 
    label: 'Ticket Médio', 
    value: 'R$ 36,25', 
    change: '+4.1%', 
    trend: 'up',
    icon: TrendingUp,
    color: 'text-purple-500'
  },
  { 
    label: 'Clientes Ativos', 
    value: '487', 
    change: '-2.3%', 
    trend: 'down',
    icon: Users,
    color: 'text-orange-500'
  },
];

const topProducts = [
  { name: 'Pizza Margherita', sales: 234, revenue: 'R$ 8.190' },
  { name: 'Pizza Calabresa', sales: 198, revenue: 'R$ 6.930' },
  { name: 'Pizza Portuguesa', sales: 176, revenue: 'R$ 6.160' },
  { name: 'Pizza 4 Queijos', sales: 156, revenue: 'R$ 5.460' },
  { name: 'Pizza Frango c/ Catupiry', sales: 143, revenue: 'R$ 5.005' },
];

export default function Analytics() {
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
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUp : ArrowDown;
          
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 bg-secondary rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span>{stat.change}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por Hora */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Vendas por Hora do Dia</h3>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {[12, 25, 18, 45, 67, 89, 95, 88, 76, 54, 32, 28].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-primary rounded-t transition-all hover:opacity-80"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-muted-foreground">
                  {i + 10}h
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Produtos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Produtos Mais Vendidos</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.sales} vendas</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{product.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Receita Mensal */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Receita Mensal</h3>
          <Select defaultValue="2025">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="h-64 flex items-end justify-between gap-3">
          {[38000, 42000, 45000, 39000, 48000, 52000, 49000, 54000, 51000, 45280, 0, 0].map((value, i) => {
            const maxValue = 54000;
            const height = value > 0 ? (value / maxValue) * 100 : 0;
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full group">
                  <div 
                    className="w-full bg-primary rounded-t transition-all hover:opacity-80"
                    style={{ height: `${height * 2.4}px` }}
                  />
                  {value > 0 && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      R$ {(value / 1000).toFixed(1)}k
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i]}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
