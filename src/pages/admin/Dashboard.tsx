import { useUnifiedAdminData } from '@/hooks/useUnifiedAdminData';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, DollarSign, Clock, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatCurrency } from '@/utils/formatting';
import { RevenueChart } from '@/components/RevenueChart';
import { AdminAuditLog } from '@/components/AdminAuditLog';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { stats, loading, refreshAllData } = useUnifiedAdminData();

  if (loading) {
    return (
      <AdminLayout 
        title="Dashboard Administrativo" 
        description="Visão geral do negócio e principais métricas"
      >
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Dashboard Administrativo" 
      description="Visão geral do negócio e principais métricas"
      onRefresh={refreshAllData}
    >
      {/* KPI Cards - Mobile & Tablet Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: {formatCurrency(stats.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Total de pedidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Análise de Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Visualize receitas detalhadas, períodos de maior venda e compare performance.
            </p>
            <Button asChild variant="default">
              <Link to="/admin/dashboard/receitas">
                Ver Receitas Detalhadas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Gestão de Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Acompanhe assinantes ativos, renovações e métricas de retenção.
            </p>
            <Button asChild variant="default">
              <Link to="/admin/dashboard/assinaturas">
                Ver Assinaturas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <div className="mb-6">
        <RevenueChart />
      </div>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auditoria e Logs */}
        <AdminAuditLog />

        {/* Top Products */}
        {stats.topSellingProducts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle>Produtos Mais Vendidos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topSellingProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.totalSold} vendidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(product.totalRevenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}