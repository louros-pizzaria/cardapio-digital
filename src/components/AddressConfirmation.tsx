
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Edit } from 'lucide-react';
import { useAddresses } from '@/hooks/useAddresses';

interface AddressConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export const AddressConfirmation = ({ isOpen, onClose, onContinue }: AddressConfirmationProps) => {
  const { addresses, loading } = useAddresses();
  const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-labelledby="address-dialog-title" aria-describedby="address-dialog-description">
        <DialogHeader>
          <DialogTitle id="address-dialog-title" className="text-center">Seu endereço está certo?</DialogTitle>
          <DialogDescription id="address-dialog-description">
            Verifique se o endereço de entrega está correto antes de continuar com o pedido.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pizza-red"></div>
            </div>
          ) : defaultAddress ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-pizza-red mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {defaultAddress.street}, {defaultAddress.number}
                    </p>
                    {defaultAddress.complement && (
                      <p className="text-sm text-muted-foreground">
                        {defaultAddress.complement}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {defaultAddress.neighborhood}, {defaultAddress.city} - {defaultAddress.state}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CEP: {defaultAddress.zip_code}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground mb-4">
                  Você ainda não tem um endereço cadastrado
                </p>
                <Button variant="outline" className="w-full">
                  Cadastrar endereço
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Voltar
            </Button>
            <Button 
              onClick={onContinue} 
              className="flex-1 gradient-pizza text-white"
              disabled={!defaultAddress}
            >
              Continuar assim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
