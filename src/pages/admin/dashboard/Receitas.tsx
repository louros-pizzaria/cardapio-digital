import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RevenueChart } from '@/components/RevenueChart';
import { useUnifiedAdminData } from '@/hooks/useUnifiedAdminData';
import { formatCurrency } from '@/utils/formatting';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Receitas() {
  const { stats, loading, refreshAllData } = useUnifiedAdminData();

  if (loading) {
    return (
      <AdminLayout 
        title="Análise de Receitas" 
        description="Visão detalhada de faturamento e performance financeira"
      >
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  const revenueGrowth = stats.revenueGrowth || 0;
  const isPositiveGrowth = revenueGrowth >= 0;

  return (
    <AdminLayout 
      title="Análise de Receitas" 
      description="Visão detalhada de faturamento e performance financeira"
      onRefresh={refreshAllData}
    >
      {/* Métricas Principais de Receita */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Todos os pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayOrders} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Por pedido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
            {isPositiveGrowth ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
              {isPositiveGrowth ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução de Receita */}
      <div className="mb-6">
        <RevenueChart />
      </div>

      {/* Cards de Análise Detalhada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos com Maior Receita</CardTitle>
            <CardDescription>Top 5 produtos em faturamento</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topSellingProducts.length > 0 ? (
              <div className="space-y-4">
                {stats.topSellingProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.totalSold} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de produto disponível
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes com Maior Gasto</CardTitle>
            <CardDescription>Top 5 clientes em valor</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topCustomers.length > 0 ? (
              <div className="space-y-4">
                {stats.topCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.orderCount} pedidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(customer.totalSpent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado de cliente disponível
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}