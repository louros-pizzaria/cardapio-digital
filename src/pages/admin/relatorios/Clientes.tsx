import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Download, Users, TrendingUp, Star, DollarSign } from 'lucide-react';

const customerStats = [
  { label: 'Total de Clientes', value: '487', icon: Users, color: 'text-blue-500' },
  { label: 'Novos (30d)', value: '34', icon: TrendingUp, color: 'text-green-500' },
  { label: 'Clientes VIP', value: '67', icon: Star, color: 'text-yellow-500' },
  { label: 'LTV Médio', value: 'R$ 892', icon: DollarSign, color: 'text-purple-500' },
];

const topCustomers = [
  { 
    name: 'João Silva', 
    orders: 45, 
    totalSpent: 'R$ 1.890',
    avgTicket: 'R$ 42,00',
    lastOrder: '2 dias',
    tier: 'VIP'
  },
  { 
    name: 'Maria Santos', 
    orders: 38, 
    totalSpent: 'R$ 1.520',
    avgTicket: 'R$ 40,00',
    lastOrder: '1 dia',
    tier: 'VIP'
  },
  { 
    name: 'Pedro Costa', 
    orders: 32, 
    totalSpent: 'R$ 1.280',
    avgTicket: 'R$ 40,00',
    lastOrder: '5 dias',
    tier: 'Regular'
  },
  { 
    name: 'Ana Oliveira', 
    orders: 28, 
    totalSpent: 'R$ 1.120',
    avgTicket: 'R$ 40,00',
    lastOrder: '3 dias',
    tier: 'Regular'
  },
  { 
    name: 'Carlos Mendes', 
    orders: 25, 
    totalSpent: 'R$ 1.000',
    avgTicket: 'R$ 40,00',
    lastOrder: '1 semana',
    tier: 'Regular'
  },
];

const customerSegments = [
  { segment: 'VIP (15+ pedidos)', count: 67, percentage: 13.8, revenue: 'R$ 18.900' },
  { segment: 'Frequente (5-14 pedidos)', count: 156, percentage: 32.0, revenue: 'R$ 15.600' },
  { segment: 'Ocasional (2-4 pedidos)', count: 189, percentage: 38.8, revenue: 'R$ 7.560' },
  { segment: 'Novo (1 pedido)', count: 75, percentage: 15.4, revenue: 'R$ 3.000' },
];

export default function Clientes() {
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
              <SelectItem value="all">Todos</SelectItem>
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
        {customerStats.map((stat, index) => {
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

      {/* Segmentação de Clientes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Segmentação de Clientes</h3>
        <div className="space-y-4">
          {customerSegments.map((seg, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold">{seg.segment}</h4>
                  <Badge variant="outline">{seg.count} clientes</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{seg.percentage}% do total</span>
                  <span>•</span>
                  <span>Receita: <strong className="text-foreground">{seg.revenue}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Clientes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Clientes</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead>Total Gasto</TableHead>
              <TableHead>Ticket Médio</TableHead>
              <TableHead>Último Pedido</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topCustomers.map((customer, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{customer.orders}</Badge>
                </TableCell>
                <TableCell className="font-bold">{customer.totalSpent}</TableCell>
                <TableCell>{customer.avgTicket}</TableCell>
                <TableCell className="text-muted-foreground">{customer.lastOrder}</TableCell>
                <TableCell>
                  <Badge variant={customer.tier === 'VIP' ? 'default' : 'secondary'}>
                    {customer.tier === 'VIP' && <Star className="h-3 w-3 mr-1" />}
                    {customer.tier}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
