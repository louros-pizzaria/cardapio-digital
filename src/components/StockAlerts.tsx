import { useAtomicStock } from "@/hooks/useAtomicStock";
import { useUnifiedAdminData } from "@/hooks/useUnifiedAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Bell, Package, RefreshCw } from "lucide-react";
import { useState } from "react";

export function StockAlerts() {
  const { productStock, systemStats, loadSystemStats } = useAtomicStock();
  const { products, refreshAllData } = useUnifiedAdminData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadSystemStats(),
        refreshAllData()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calcular alertas
  const stockArray = Object.values(productStock);
  const criticalAlerts = stockArray.filter(stock => stock.available_quantity === 0);
  const lowStockAlerts = stockArray.filter(stock => 
    stock.available_quantity > 0 && stock.available_quantity <= stock.reorder_level
  );
  const warningAlerts = stockArray.filter(stock => 
    stock.available_quantity > stock.reorder_level && 
    stock.available_quantity <= stock.reorder_level * 1.5
  );

  const getAlertPriority = (available: number, reorderLevel: number) => {
    if (available === 0) return 'critical';
    if (available <= reorderLevel) return 'high';
    if (available <= reorderLevel * 1.5) return 'medium';
    return 'low';
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Bell className="h-4 w-4 text-yellow-500" />;
      default: return <Package className="h-4 w-4 text-blue-500" />;
    }
  };

  const allAlerts = [
    ...criticalAlerts.map(stock => ({ ...stock, priority: 'critical', message: 'Produto sem estoque' })),
    ...lowStockAlerts.map(stock => ({ ...stock, priority: 'high', message: 'Estoque baixo - reposição necessária' })),
    ...warningAlerts.map(stock => ({ ...stock, priority: 'medium', message: 'Estoque em atenção' }))
  ].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas de Alertas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alertas de Estoque</h2>
          <p className="text-muted-foreground">
            {allAlerts.length} alertas ativos • {criticalAlerts.length} críticos
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Produtos sem estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <Bell className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Reposição necessária</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atenção</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Monitoar de perto</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Ativos</CardTitle>
          <CardDescription>
            Lista de todos os produtos que requerem atenção ordenados por prioridade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <h3 className="text-lg font-medium text-green-600 mb-2">Todos os estoques estão OK!</h3>
              <p className="text-muted-foreground">
                Não há alertas de estoque no momento. Continue monitorando regularmente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allAlerts.map((alert) => {
                const product = products.find(p => p.id === alert.product_id);
                const stockPercentage = alert.reorder_level > 0 
                  ? Math.min(100, (alert.available_quantity / alert.reorder_level) * 100)
                  : 0;

                return (
                  <div key={alert.product_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getPriorityIcon(alert.priority)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{product?.name || 'Produto não encontrado'}</h4>
                            <Badge variant={getAlertColor(alert.priority) as any}>
                              {alert.priority === 'critical' && 'Crítico'}
                              {alert.priority === 'high' && 'Alto'}
                              {alert.priority === 'medium' && 'Médio'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Disponível:</span>
                              <span className="ml-1 font-medium">{alert.available_quantity}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reservado:</span>
                              <span className="ml-1 font-medium">{alert.reserved_quantity}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Ponto de Reposição:</span>
                              <span className="ml-1 font-medium">{alert.reorder_level}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Preço:</span>
                              <span className="ml-1 font-medium">
                                {product ? new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(product.price) : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {alert.priority !== 'critical' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Nível do estoque</span>
                          <span>{stockPercentage.toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={stockPercentage} 
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}