import { useDeliveryIntegrations } from '@/hooks/useDeliveryIntegrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';

export default function Delivery() {
  const { platformStatus, stats, loadingOrders } = useDeliveryIntegrations();

  if (loadingOrders) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plataformas de Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {platformStatus.map((platform) => (
              <div key={platform.platform} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">{platform.platform}</h3>
                <Badge variant={platform.status === 'connected' ? 'default' : 'secondary'}>
                  {platform.status}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">{platform.orders} pedidos</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
