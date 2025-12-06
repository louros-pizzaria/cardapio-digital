import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ShoppingCart } from 'lucide-react';
import { useUnifiedStore } from '@/stores/simpleStore';
import { useNavigate } from 'react-router-dom';
import { useStoreSchedule } from '@/hooks/useStoreSchedule';
import { StoreClosedAlert } from '@/components/StoreClosedAlert';

export const FixedCartFooter = () => {
  const { items, getTotal, getItemCount } = useUnifiedStore();
  const navigate = useNavigate();
  const { isOpen, scheduleData } = useStoreSchedule();
  const [showClosedAlert, setShowClosedAlert] = useState(false);
  const itemCount = getItemCount();
  const total = getTotal();

  if (itemCount === 0) return null;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleCheckoutClick = () => {
    // Verificar se horário automático está ativo e loja está fechada
    if (scheduleData?.autoSchedule && !isOpen) {
      setShowClosedAlert(true);
      return;
    }
    
    navigate('/checkout');
  };

  const isDisabled = scheduleData?.autoSchedule && !isOpen;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:left-64 z-40">
        <div className="max-w-2xl mx-auto">
          <Button 
            className="w-full gradient-pizza text-white h-12 flex items-center justify-between"
            onClick={handleCheckoutClick}
            disabled={isDisabled}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-pizza-orange text-white">
                  {itemCount}
                </Badge>
              </div>
              <span>Ver sacola</span>
            </div>
            <span className="font-bold">{formatPrice(total)}</span>
          </Button>
        </div>
      </div>

      <Dialog open={showClosedAlert} onOpenChange={setShowClosedAlert}>
        <DialogContent>
          <StoreClosedAlert 
            variant="modal"
            onClose={() => setShowClosedAlert(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
