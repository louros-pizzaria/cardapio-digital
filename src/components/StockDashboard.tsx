import { useAtomicStock } from "@/hooks/useAtomicStock";
import { useUnifiedAdminData } from "@/hooks/useUnifiedAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, AlertTriangle, TrendingUp, ShoppingCart } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function StockDashboard() {
  const { systemStats, productStock, isLoading: stockLoading, loadSystemStats, loadProductStock } = useAtomicStock();
  const { products, stats, loading: productsLoading } = useUnifiedAdminData();

  if (stockLoading || productsLoading) {
    return <LoadingSpinner />;
  }

  const stockArray = Object.values(productStock);
  const lowStockProducts = stockArray.filter(stock => 
    stock.available_quantity <= stock.reorder_level && stock.available_quantity > 0
  );

  const outOfStockProducts = stockArray.filter(stock => 
    stock.available_quantity === 0
  );

  const stockValue = products.reduce((total, product) => {
    const stock = productStock[product.id];
    return total + (stock ? stock.available_quantity * product.price : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableProducts} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <ShoppingCart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Reposição urgente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor do Estoque</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stockValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total em estoque
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Estoque */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alertas de Estoque
            </CardTitle>
            <CardDescription>
              Produtos que precisam de atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {outOfStockProducts.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">Sem Estoque ({outOfStockProducts.length})</h4>
                <div className="space-y-2">
                  {outOfStockProducts.slice(0, 5).map((stock) => {
                    const product = products.find(p => p.id === stock.product_id);
                    return (
                      <div key={stock.product_id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                        <div>
                          <p className="font-medium">{product?.name || 'Produto não encontrado'}</p>
                          <p className="text-sm text-muted-foreground">
                            Estoque: {stock.available_quantity} | Reservado: {stock.reserved_quantity}
                          </p>
                        </div>
                        <Badge variant="destructive">Sem Estoque</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {lowStockProducts.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-600 mb-2">Estoque Baixo ({lowStockProducts.length})</h4>
                <div className="space-y-2">
                  {lowStockProducts.slice(0, 5).map((stock) => {
                    const product = products.find(p => p.id === stock.product_id);
                    const stockPercentage = (stock.available_quantity / stock.reorder_level) * 100;
                    
                    return (
                      <div key={stock.product_id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                        <div className="flex-1">
                          <p className="font-medium">{product?.name || 'Produto não encontrado'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={stockPercentage} className="flex-1 h-2" />
                            <span className="text-sm text-muted-foreground">
                              {stock.available_quantity}/{stock.reorder_level}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-4">Baixo</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Produtos por Estoque */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos com Maior Estoque</CardTitle>
          <CardDescription>
            Top 10 produtos com maior quantidade disponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stockArray
              .filter(stock => stock.available_quantity > 0)
              .sort((a, b) => b.available_quantity - a.available_quantity)
              .slice(0, 10)
              .map((stock) => {
                const product = products.find(p => p.id === stock.product_id);
                return (
                  <div key={stock.product_id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">{product?.name || 'Produto não encontrado'}</p>
                      <p className="text-sm text-muted-foreground">
                        Reservado: {stock.reserved_quantity}
                      </p>
                    </div>
                    <Badge variant="outline">{stock.available_quantity} un.</Badge>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}