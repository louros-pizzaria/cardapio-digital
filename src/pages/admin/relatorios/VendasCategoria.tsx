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
import { Download, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

const categories = [
  { 
    name: 'Pizzas', 
    sales: 856, 
    revenue: 'R$ 29.960',
    percentage: 66.2,
    growth: '+12.5%',
    trend: 'up',
    avgTicket: 'R$ 35,00'
  },
  { 
    name: 'Bebidas', 
    sales: 324, 
    revenue: 'R$ 4.860',
    percentage: 10.7,
    growth: '+8.2%',
    trend: 'up',
    avgTicket: 'R$ 15,00'
  },
  { 
    name: 'Sobremesas', 
    sales: 198, 
    revenue: 'R$ 3.960',
    percentage: 8.7,
    growth: '-2.1%',
    trend: 'down',
    avgTicket: 'R$ 20,00'
  },
  { 
    name: 'Porções', 
    sales: 167, 
    revenue: 'R$ 5.010',
    percentage: 11.0,
    growth: '+5.3%',
    trend: 'up',
    avgTicket: 'R$ 30,00'
  },
  { 
    name: 'Saladas', 
    sales: 89, 
    revenue: 'R$ 1.780',
    percentage: 3.9,
    growth: '-4.2%',
    trend: 'down',
    avgTicket: 'R$ 20,00'
  },
];

const topProducts = [
  { name: 'Pizza Margherita', category: 'Pizzas', sales: 234, revenue: 'R$ 8.190' },
  { name: 'Pizza Calabresa', category: 'Pizzas', sales: 198, revenue: 'R$ 6.930' },
  { name: 'Coca-Cola 2L', category: 'Bebidas', sales: 156, revenue: 'R$ 2.340' },
  { name: 'Pizza Portuguesa', category: 'Pizzas', sales: 176, revenue: 'R$ 6.160' },
  { name: 'Porção de Batata', category: 'Porções', sales: 143, revenue: 'R$ 4.290' },
  { name: 'Pizza 4 Queijos', category: 'Pizzas', sales: 156, revenue: 'R$ 5.460' },
  { name: 'Guaraná 2L', category: 'Bebidas', sales: 134, revenue: 'R$ 2.010' },
  { name: 'Brownie', category: 'Sobremesas', sales: 98, revenue: 'R$ 1.960' },
];

export default function VendasCategoria() {
  const totalRevenue = categories.reduce((acc, cat) => {
    return acc + parseFloat(cat.revenue.replace('R$ ', '').replace('.', '').replace(',', '.'));
  }, 0);

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

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categorias Ativas</p>
              <p className="text-2xl font-bold">{categories.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Vendidos</p>
              <p className="text-2xl font-bold">{categories.reduce((acc, cat) => acc + cat.sales, 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance por Categoria */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Performance por Categoria</h3>
        <div className="space-y-6">
          {categories.map((category, index) => {
            const TrendIcon = category.trend === 'up' ? ArrowUp : ArrowDown;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{category.name}</h4>
                      <Badge variant="outline">{category.sales} vendas</Badge>
                      <div className={`flex items-center gap-1 text-sm ${category.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{category.growth}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Receita: <strong className="text-foreground">{category.revenue}</strong></span>
                      <span>Ticket médio: <strong className="text-foreground">{category.avgTicket}</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{category.percentage}%</p>
                    <p className="text-xs text-muted-foreground">do total</p>
                  </div>
                </div>
                <Progress value={category.percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Produtos */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Produtos por Categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topProducts.map((product, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{product.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{product.category}</Badge>
                  <span className="text-sm text-muted-foreground">{product.sales} vendas</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{product.revenue}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
