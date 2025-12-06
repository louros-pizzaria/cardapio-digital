import { MapPin, Store, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatWhatsAppMessage } from '@/utils/orderStatusHelpers';

interface DeliveryInfoProps {
  order: any;
  address?: any;
  storeInfo?: any;
}

export const DeliveryInfo = ({ order, address, storeInfo }: DeliveryInfoProps) => {
  const handleWhatsApp = () => {
    const phone = '5511999999999'; // TODO: Get from store settings
    const message = formatWhatsAppMessage(order.id);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (order.delivery_method === 'pickup') {
    return (
      <Card className="border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base text-foreground">Retirada no Local</h3>
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{storeInfo?.name || 'Restaurante'}</p>
            <p className="text-muted-foreground">{storeInfo?.address}</p>
            {storeInfo?.neighborhood && (
              <p className="text-muted-foreground">{storeInfo.neighborhood}</p>
            )}
            {storeInfo?.city && storeInfo?.state && (
              <p className="text-muted-foreground">{storeInfo.city} - {storeInfo.state}</p>
            )}
            {storeInfo?.zip_code && (
              <p className="text-muted-foreground">CEP: {storeInfo.zip_code}</p>
            )}
          </div>

          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Horário estimado de retirada: <span className="font-semibold text-foreground">30-40 min</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base text-foreground">Entregar em</h3>
        </div>

        {address && (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">
              {address.street}, {address.number}
            </p>
            {address.complement && (
              <p className="text-muted-foreground">{address.complement}</p>
            )}
            <p className="text-muted-foreground">
              {address.neighborhood} - CEP: {address.zip_code}
            </p>
            <p className="text-muted-foreground">
              {address.city}, {address.state}
            </p>
            {address.reference_point && (
              <p className="text-xs text-muted-foreground mt-2">
                <span className="font-medium">Referência:</span> {address.reference_point}
              </p>
            )}
          </div>
        )}

        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            className="w-full mt-2"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Enviar atualização via WhatsApp
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
