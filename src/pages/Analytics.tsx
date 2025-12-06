import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  Package,
  Star,
  Target,
  Calendar,
  MapPin,
  Percent
} from 'lucide-react';

interface AnalyticsData {
  // KPIs principais
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  averageOrderValue: number;
  aovGrowth: number;
  customerCount: number;
  customerGrowth: number;
  deliveryTime: number;
  deliveryTimeImprovement: number;
  conversionRate: number;
  conversionGrowth: number;
  
  // Dados para gráficos
  salesData: Array<{
    date: string;
    revenue: number;
    orders: number;
    customers: number;
  }>;
  
  productData: Array<{
    name: string;
    revenue: number;
    quantity: number;
    percentage: number;
  }>;
  
  categoryData: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  
  hourlyData: Array<{
    hour: string;
    orders: number;
    revenue: number;
  }>;
  
  weeklyData: Array<{
    day: string;
    orders: number;
    revenue: number;
  }>;
  
  customerSegments: Array<{
    segment: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  
  deliveryPerformance: Array<{
    zone: string;
    averageTime: number;
    orders: number;
    rating: number;
  }>;
  
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    orders: number;
    newCustomers: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000'];

export default function Analytics() {
  const { user } = useUnifiedAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    ordersGrowth: 0,
    averageOrderValue: 0,
    aovGrowth: 0,
    customerCount: 0,
    customerGrowth: 0,
    deliveryTime: 0,
    deliveryTimeImprovement: 0,
    conversionRate: 0,
    conversionGrowth: 0,
    salesData: [],
    productData: [],
    categoryData: [],
    hourlyData: [],
    weeklyData: [],
    customerSegments: [],
    deliveryPerformance: [],
    monthlyTrends: []
  });

  // Load data on component mount and when date range changes
  useEffect(() => {
    if (user) {
      loadAnalyticsData().finally(() => setLoading(false));
    }
  }, [dateRange, user]);

  const getDateFilter = () => {
    const now = new Date();
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    };
    return ranges[dateRange as keyof typeof ranges] || ranges['30d'];
  };

  const loadAnalyticsData = async () => {
    try {
      const startDate = getDateFilter();
      const startDateStr = startDate.toISOString();

      // KPIs principais
      const [ordersRes, usersRes] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount, created_at, user_id, estimated_delivery_time')
          .gte('created_at', startDateStr),
        supabase
          .from('profiles')
          .select('id, created_at')
          .gte('created_at', startDateStr)
      ]);

      const orders = ordersRes.data || [];
      const users = usersRes.data || [];

      // Calcular KPIs
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const customerCount = users.length;
      const averageDeliveryTime = orders.length > 0 
        ? orders.reduce((sum, order) => sum + (order.estimated_delivery_time || 45), 0) / orders.length 
        : 45;

      // Dados de vendas ao longo do tempo
      const salesByDate = orders.reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { revenue: 0, orders: 0, customers: new Set() };
        }
        acc[date].revenue += Number(order.total_amount);
        acc[date].orders += 1;
        acc[date].customers.add(order.user_id);
        return acc;
      }, {} as Record<string, { revenue: number; orders: number; customers: Set<string> }>);

      const salesData = Object.entries(salesByDate)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          revenue: data.revenue,
          orders: data.orders,
          customers: data.customers.size
        }))
        .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime())
        .slice(-14); // Últimos 14 dias

      // Dados de produtos mais vendidos
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          quantity,
          total_price,
          products(name),
          orders!inner(created_at)
        `)
        .gte('orders.created_at', startDateStr);

      const productStats = (orderItems || []).reduce((acc, item) => {
        const productName = item.products?.name || 'Produto desconhecido';
        if (!acc[productName]) {
          acc[productName] = { revenue: 0, quantity: 0 };
        }
        acc[productName].revenue += Number(item.total_price);
        acc[productName].quantity += item.quantity;
        return acc;
      }, {} as Record<string, { revenue: number; quantity: number }>);

      const totalProductRevenue = Object.values(productStats).reduce((sum, p) => sum + p.revenue, 0);
      const productData = Object.entries(productStats)
        .map(([name, data]) => ({
          name,
          revenue: data.revenue,
          quantity: data.quantity,
          percentage: totalProductRevenue > 0 ? (data.revenue / totalProductRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Dados por categoria
      const { data: categoryStats } = await supabase
        .from('order_items')
        .select(`
          quantity,
          total_price,
          products!inner(
            categories!inner(name)
          ),
          orders!inner(created_at)
        `)
        .gte('orders.created_at', startDateStr);

      const categoryData = (categoryStats || []).reduce((acc, item) => {
        const categoryName = item.products?.categories?.name || 'Categoria desconhecida';
        if (!acc[categoryName]) {
          acc[categoryName] = 0;
        }
        acc[categoryName] += Number(item.total_price);
        return acc;
      }, {} as Record<string, number>);

      const totalCategoryRevenue = Object.values(categoryData).reduce((sum, value) => sum + value, 0);
      const categoryChartData = Object.entries(categoryData)
        .map(([name, value]) => ({
          name,
          value,
          percentage: totalCategoryRevenue > 0 ? (value / totalCategoryRevenue) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value);

      // Dados por hora do dia
      const hourlyStats = orders.reduce((acc, order) => {
        const hour = new Date(order.created_at).getHours();
        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
        if (!acc[hourStr]) {
          acc[hourStr] = { orders: 0, revenue: 0 };
        }
        acc[hourStr].orders += 1;
        acc[hourStr].revenue += Number(order.total_amount);
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hour = `${i.toString().padStart(2, '0')}:00`;
        return {
          hour,
          orders: hourlyStats[hour]?.orders || 0,
          revenue: hourlyStats[hour]?.revenue || 0
        };
      });

      // Dados por dia da semana
      const weeklyStats = orders.reduce((acc, order) => {
        const dayIndex = new Date(order.created_at).getDay();
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const day = dayNames[dayIndex];
        if (!acc[day]) {
          acc[day] = { orders: 0, revenue: 0 };
        }
        acc[day].orders += 1;
        acc[day].revenue += Number(order.total_amount);
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      const weeklyData = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => ({
        day,
        orders: weeklyStats[day]?.orders || 0,
        revenue: weeklyStats[day]?.revenue || 0
      }));

      // Segmentação de clientes
      const customerOrders = orders.reduce((acc, order) => {
        if (!acc[order.user_id]) {
          acc[order.user_id] = { count: 0, revenue: 0 };
        }
        acc[order.user_id].count += 1;
        acc[order.user_id].revenue += Number(order.total_amount);
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const customerSegments = Object.values(customerOrders).reduce((acc, customer) => {
        let segment = 'Novo';
        if (customer.count >= 10) segment = 'VIP';
        else if (customer.count >= 5) segment = 'Fiel';
        else if (customer.count >= 2) segment = 'Recorrente';

        if (!acc[segment]) {
          acc[segment] = { count: 0, revenue: 0 };
        }
        acc[segment].count += 1;
        acc[segment].revenue += customer.revenue;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const totalCustomers = Object.values(customerSegments).reduce((sum, seg) => sum + seg.count, 0);
      const customerSegmentData = Object.entries(customerSegments).map(([segment, data]) => ({
        segment,
        count: data.count,
        revenue: data.revenue,
        percentage: totalCustomers > 0 ? (data.count / totalCustomers) * 100 : 0
      }));

      // Performance de entrega por zona (simulado)
      const deliveryPerformance = [
        { zone: 'Centro', averageTime: 35, orders: Math.floor(totalOrders * 0.3), rating: 4.5 },
        { zone: 'Zona Norte', averageTime: 42, orders: Math.floor(totalOrders * 0.25), rating: 4.3 },
        { zone: 'Zona Sul', averageTime: 38, orders: Math.floor(totalOrders * 0.2), rating: 4.4 },
        { zone: 'Zona Leste', averageTime: 45, orders: Math.floor(totalOrders * 0.15), rating: 4.2 },
        { zone: 'Zona Oeste', averageTime: 40, orders: Math.floor(totalOrders * 0.1), rating: 4.1 }
      ];

      // Tendências mensais (últimos 6 meses)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStr = monthDate.toLocaleDateString('pt-BR', { month: 'short' });
        
        const monthOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === monthDate.getMonth() && 
                 orderDate.getFullYear() === monthDate.getFullYear();
        });
        
        const monthUsers = users.filter(user => {
          const userDate = new Date(user.created_at);
          return userDate.getMonth() === monthDate.getMonth() && 
                 userDate.getFullYear() === monthDate.getFullYear();
        });

        monthlyTrends.push({
          month: monthStr,
          revenue: monthOrders.reduce((sum, order) => sum + Number(order.total_amount), 0),
          orders: monthOrders.length,
          newCustomers: monthUsers.length
        });
      }

      setData({
        totalRevenue,
        revenueGrowth: 12.5, // Simulado
        totalOrders,
        ordersGrowth: 8.3, // Simulado
        averageOrderValue,
        aovGrowth: 4.2, // Simulado
        customerCount,
        customerGrowth: 15.7, // Simulado
        deliveryTime: averageDeliveryTime,
        deliveryTimeImprovement: -3.2, // Simulado (negativo = melhoria)
        conversionRate: 78.5, // Simulado
        conversionGrowth: 2.1, // Simulado
        salesData,
        productData,
        categoryData: categoryChartData,
        hourlyData,
        weeklyData,
        customerSegments: customerSegmentData,
        deliveryPerformance,
        monthlyTrends
      });

    } catch (error) {
      console.error('Erro ao carregar dados de analytics:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de analytics.',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Analytics & BI</h1>
              <p className="text-muted-foreground">Análise detalhada de performance e KPIs</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="1y">Último ano</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => navigate('/admin')} variant="outline">
                Voltar ao Admin
              </Button>
            </div>
          </div>

          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
                <p className={`text-xs flex items-center ${data.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.revenueGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(data.revenueGrowth)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalOrders}</div>
                <p className={`text-xs flex items-center ${data.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.ordersGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(data.ordersGrowth)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.averageOrderValue)}</div>
                <p className={`text-xs flex items-center ${data.aovGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.aovGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(data.aovGrowth)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerCount}</div>
                <p className={`text-xs flex items-center ${data.customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.customerGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(data.customerGrowth)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Entrega</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(data.deliveryTime)}min</div>
                <p className={`text-xs flex items-center ${data.deliveryTimeImprovement <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.deliveryTimeImprovement <= 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                  {formatPercent(Math.abs(data.deliveryTimeImprovement))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</div>
                <p className={`text-xs flex items-center ${data.conversionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.conversionGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {formatPercent(data.conversionGrowth)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs de Analytics */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="sales">Vendas</TabsTrigger>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="customers">Clientes</TabsTrigger>
              <TabsTrigger value="operations">Operações</TabsTrigger>
            </TabsList>

            {/* Visão Geral */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas ao Longo do Tempo</CardTitle>
                    <CardDescription>Receita e pedidos dos últimos 14 dias</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={data.salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'revenue' ? formatCurrency(Number(value)) : value,
                            name === 'revenue' ? 'Receita' : name === 'orders' ? 'Pedidos' : 'Clientes'
                          ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Receita" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} name="Pedidos" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tendências Mensais</CardTitle>
                    <CardDescription>Performance dos últimos 6 meses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={data.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'revenue' ? formatCurrency(Number(value)) : value,
                            name === 'revenue' ? 'Receita' : name === 'orders' ? 'Pedidos' : 'Novos Clientes'
                          ]}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Receita" />
                        <Area type="monotone" dataKey="orders" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Pedidos" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas por Categoria</CardTitle>
                    <CardDescription>Distribuição da receita por categoria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Segmentação de Clientes</CardTitle>
                    <CardDescription>Distribuição por comportamento de compra</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.customerSegments.map((segment, index) => (
                        <div key={segment.segment} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-medium">{segment.segment}</p>
                              <p className="text-sm text-muted-foreground">{segment.count} clientes</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(segment.revenue)}</p>
                            <p className="text-sm text-muted-foreground">{segment.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Vendas */}
            <TabsContent value="sales" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vendas por Hora do Dia</CardTitle>
                    <CardDescription>Picos de demanda ao longo do dia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'revenue' ? formatCurrency(Number(value)) : value,
                            name === 'revenue' ? 'Receita' : 'Pedidos'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="orders" fill="#8884d8" name="Pedidos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Vendas por Dia da Semana</CardTitle>
                    <CardDescription>Performance semanal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'revenue' ? formatCurrency(Number(value)) : value,
                            name === 'revenue' ? 'Receita' : 'Pedidos'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#82ca9d" name="Receita" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Produtos */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
                  <CardDescription>Ranking por receita gerada</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.productData.map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.quantity} unidades vendidas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(product.revenue)}</p>
                          <p className="text-sm text-muted-foreground">{product.percentage.toFixed(1)}% do total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clientes */}
            <TabsContent value="customers" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Segmentação Detalhada</CardTitle>
                    <CardDescription>Análise de comportamento dos clientes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.customerSegments}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ segment, percentage }) => `${segment}: ${percentage.toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {data.customerSegments.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Métricas de Retenção</CardTitle>
                    <CardDescription>Indicadores de fidelização</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <h3 className="text-2xl font-bold text-green-600">85%</h3>
                        <p className="text-sm text-muted-foreground">Taxa de Retenção (30 dias)</p>
                      </div>
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <h3 className="text-2xl font-bold text-blue-600">3.2</h3>
                        <p className="text-sm text-muted-foreground">Pedidos por Cliente (Média)</p>
                      </div>
                      <div className="text-center p-4 bg-secondary rounded-lg">
                        <h3 className="text-2xl font-bold text-purple-600">12 dias</h3>
                        <p className="text-sm text-muted-foreground">Intervalo Médio entre Pedidos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Operações */}
            <TabsContent value="operations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance de Entrega por Zona</CardTitle>
                  <CardDescription>Análise operacional por região</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.deliveryPerformance.map((zone) => (
                      <div key={zone.zone} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div className="flex items-center gap-4">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{zone.zone}</p>
                            <p className="text-sm text-muted-foreground">{zone.orders} pedidos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="font-medium">{zone.averageTime}min</p>
                            <p className="text-xs text-muted-foreground">Tempo médio</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <p className="font-medium">{zone.rating}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Avaliação</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}