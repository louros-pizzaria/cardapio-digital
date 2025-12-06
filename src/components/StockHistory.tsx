import { useState, useEffect } from 'react';
import { useAtomicStock } from "@/hooks/useAtomicStock";
import { useUnifiedAdminData } from "@/hooks/useUnifiedAdminData";
import { getStockAuditLogs } from '@/utils/atomicStockControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Filter, History, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function StockHistory() {
  const { } = useAtomicStock();
  const { products } = useUnifiedAdminData();
  
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    productId: '',
    action: '',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    limit: 50
  });

  useEffect(() => {
    loadHistoryData();
  }, [filters.productId, filters.action, filters.limit]);

  const loadHistoryData = async () => {
    setIsLoading(true);
    try {
      const logs = await getStockAuditLogs(filters.productId || undefined, filters.limit);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'reserve': return 'secondary';
      case 'release': return 'outline';
      case 'confirm': return 'default';
      case 'adjust': return 'destructive';
      default: return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'reserve': return 'Reserva';
      case 'release': return 'Liberação';
      case 'confirm': return 'Confirmação';
      case 'adjust': return 'Ajuste';
      default: return action;
    }
  };

  const getQuantityDisplay = (change: number) => {
    if (change > 0) {
      return <span className="text-green-600 font-medium">+{change}</span>;
    } else if (change < 0) {
      return <span className="text-red-600 font-medium">{change}</span>;
    }
    return <span className="text-muted-foreground">0</span>;
  };

  const exportHistory = () => {
    // Preparar dados para exportação
    const csvData = auditLogs.map(log => {
      const product = products.find(p => p.id === log.product_id);
      return {
        'Data/Hora': format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Produto': product?.name || 'N/A',
        'Ação': getActionLabel(log.action),
        'Quantidade Anterior': log.quantity_before,
        'Quantidade Posterior': log.quantity_after,
        'Alteração': log.quantity_change,
        'Motivo': log.reason || '-',
        'ID Pedido': log.order_id || '-',
        'ID Reserva': log.reservation_id || '-',
      };
    });

    // Converter para CSV
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escapar valores que contém vírgulas
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    // Criar e baixar arquivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-estoque-${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre o histórico de movimentações por produto, ação ou período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Produto</label>
              <Select value={filters.productId} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, productId: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os produtos</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ação</label>
              <Select value={filters.action} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, action: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as ações</SelectItem>
                  <SelectItem value="reserve">Reserva</SelectItem>
                  <SelectItem value="release">Liberação</SelectItem>
                  <SelectItem value="confirm">Confirmação</SelectItem>
                  <SelectItem value="adjust">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Limite</label>
              <Select value={filters.limit.toString()} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, limit: parseInt(value) }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 registros</SelectItem>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="200">200 registros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ações</label>
              <div className="flex gap-2">
                <Button 
                  onClick={loadHistoryData} 
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button 
                  onClick={exportHistory}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Movimentações
          </CardTitle>
          <CardDescription>
            {auditLogs.length} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros ou verifique se há movimentações de estoque
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => {
                const product = products.find(p => p.id === log.product_id);
                
                return (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{product?.name || 'Produto não encontrado'}</h4>
                          <Badge variant={getActionColor(log.action) as any}>
                            {getActionLabel(log.action)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Quantidade:</span>
                            {getQuantityDisplay(log.quantity_change)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Antes:</span>
                            <span className="ml-1 font-medium">{log.quantity_before}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Depois:</span>
                            <span className="ml-1 font-medium">{log.quantity_after}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data:</span>
                            <span className="ml-1 font-medium">
                              {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        
                        {log.reason && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Motivo:</strong> {log.reason}
                          </p>
                        )}
                        
                        {log.order_id && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Pedido:</strong> {log.order_id}
                          </p>
                        )}
                      </div>
                    </div>
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