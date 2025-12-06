import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/utils/formatting';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';

interface ChartDataPoint {
  period_date: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

export const RevenueChart = () => {
  const [period, setPeriod] = useState<string>('week');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgTicket: 0,
    growth: 0
  });

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados do gráfico
      const { data, error } = await supabase
        .rpc('get_revenue_chart_data', {
          p_period: period,
          p_limit: period === 'year' ? 12 : 30
        });

      if (error) throw error;

      if (data && data.length > 0) {
        // Reverter ordem para mostrar do mais antigo ao mais recente
        const formattedData = [...data].reverse().map((item: any) => ({
          ...item,
          date: format(new Date(item.period_date), period === 'year' ? 'MMM' : 'dd/MM', { locale: ptBR })
        }));
        
        setChartData(formattedData);

        // Calcular estatísticas
        const totalRevenue = data.reduce((sum: number, item: any) => sum + parseFloat(item.total_revenue || 0), 0);
        const totalOrders = data.reduce((sum: number, item: any) => sum + parseInt(item.total_orders || 0), 0);
        const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calcular crescimento (comparar primeira metade com segunda metade)
        const midpoint = Math.floor(data.length / 2);
        const firstHalf = data.slice(0, midpoint);
        const secondHalf = data.slice(midpoint);
        
        const firstHalfRevenue = firstHalf.reduce((sum: number, item: any) => sum + parseFloat(item.total_revenue || 0), 0);
        const secondHalfRevenue = secondHalf.reduce((sum: number, item: any) => sum + parseFloat(item.total_revenue || 0), 0);
        
        const growth = firstHalfRevenue > 0 
          ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
          : 0;

        setStats({
          totalRevenue,
          totalOrders,
          avgTicket,
          growth
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4">
          <p className="font-semibold mb-2">{payload[0].payload.date}</p>
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 text-green-600" />
              <span>Receita: {formatCurrency(payload[0].value)}</span>
            </p>
            <p className="flex items-center gap-2">
              <ShoppingCart className="h-3 w-3 text-blue-600" />
              <span>Pedidos: {payload[0].payload.total_orders}</span>
            </p>
            <p className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-purple-600" />
              <span>Ticket Médio: {formatCurrency(payload[0].payload.avg_ticket)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evolução de Receita</CardTitle>
            <CardDescription>Análise de vendas e faturamento</CardDescription>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Últimos 30 dias</SelectItem>
              <SelectItem value="year">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* KPIs Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Receita Total</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span>Total de Pedidos</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Ticket Médio</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(stats.avgTicket)}</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Crescimento</span>
                </div>
                <div className={`text-2xl font-bold ${stats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1}
                  fill="url(#colorRevenue)" 
                  name="Receita"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};