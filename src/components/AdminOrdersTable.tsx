import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VirtualizedList } from './VirtualizedList';
import { formatCurrency, formatDateTime } from '@/utils/formatting';
import { Eye } from 'lucide-react';
import { ThermalPrintPreviewDialog } from './ThermalPrintPreviewDialog';
import { formatOrderForPreview } from '@/utils/thermalPrintFormatter';
import { useThermalPrint } from '@/hooks/useThermalPrint';
import { toast } from 'sonner';

// Definindo o tipo AdminOrder diretamente
interface AdminOrder {
  id: string;
  order_number: number;
  status: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface AdminOrdersTableProps {
  orders: AdminOrder[];
  onUpdateStatus: (orderId: string, status: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'preparing': return 'bg-orange-100 text-orange-800';
    case 'ready': return 'bg-purple-100 text-purple-800';
    case 'in_delivery': return 'bg-indigo-100 text-indigo-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'confirmed': return 'Confirmado';
    case 'preparing': return 'Preparando';
    case 'ready': return 'Pronto (Retirada)';
    case 'in_delivery': return 'Em Rota de Entrega';
    case 'delivered': return 'Entregue';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
};

export const AdminOrdersTable = ({ orders, onUpdateStatus }: AdminOrdersTableProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewLines, setPreviewLines] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const { getOrderPreview, printOrder, isPrinting } = useThermalPrint();

  const handleShowPreview = async (order: AdminOrder) => {
    try {
      const orderData = await getOrderPreview(order.id);
      const lines = formatOrderForPreview(orderData);
      setPreviewLines(lines);
      setSelectedOrder(order);
      setShowPreview(true);
    } catch (error) {
      toast.error("Erro ao carregar preview do pedido");
      console.error(error);
    }
  };

  const handlePrintFromPreview = async () => {
    if (selectedOrder) {
      try {
        await printOrder(selectedOrder.id);
        toast.success("Pedido enviado para impressão");
      } catch (error) {
        toast.error("Erro ao imprimir pedido");
      }
    }
  };

  const renderOrder = (order: AdminOrder) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-medium">#{order.order_number}</p>
            <p className="text-sm text-muted-foreground">
              {order.profiles?.full_name || 'Cliente'} • {formatDateTime(order.created_at)}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {getStatusLabel(order.status)}
          </Badge>
          <div className="text-right">
            <p className="font-medium">{formatCurrency(order.total_amount)}</p>
            <p className="text-sm text-muted-foreground">{order.payment_method}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShowPreview(order)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Select
          value={order.status}
          onValueChange={(value) => onUpdateStatus(order.id, value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="preparing">Preparando</SelectItem>
            <SelectItem value="ready">Pronto</SelectItem>
            <SelectItem value="in_delivery">Em Entrega</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground">Nenhum pedido encontrado</p>
        ) : orders.length > 15 ? (
          <div style={{ height: '600px' }}>
            <VirtualizedList
              items={orders}
              estimateSize={100}
              renderItem={renderOrder}
              containerClassName="space-y-4"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id}>
                {renderOrder(order)}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ThermalPrintPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        lines={previewLines}
        onConfirm={handlePrintFromPreview}
        title={`Preview do Pedido #${selectedOrder?.id.slice(0, 8)}`}
        description="Visualize como a comanda será impressa"
      />
    </Card>
  );
};