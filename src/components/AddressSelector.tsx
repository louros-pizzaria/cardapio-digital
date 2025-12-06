import { useState } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Address {
  id: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
  reference_point?: string;
  is_default: boolean;
}

interface AddressSelectorProps {
  addresses: Address[];
  selectedAddressId: string;
  onSelect: (addressId: string, neighborhood: string) => void;
}

export function AddressSelector({ addresses, selectedAddressId, onSelect }: AddressSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId) || addresses[0];

  const handleSelectAddress = (address: Address) => {
    console.debug('AddressSelector: Endereço selecionado:', {
      id: address.id,
      neighborhood: address.neighborhood
    });
    onSelect(address.id, address.neighborhood);
    setOpen(false);
  };

  if (!selectedAddress) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3 flex-1">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">Endereço de entrega</p>
                <p className="font-medium truncate">
                  {selectedAddress.street}, {selectedAddress.number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedAddress.neighborhood}
                  {selectedAddress.complement && ` - ${selectedAddress.complement}`}
                </p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
          </div>
        </div>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Selecionar Endereço</SheetTitle>
          <SheetDescription>
            Escolha o endereço de entrega para este pedido
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(80vh-120px)]">
          <RadioGroup value={selectedAddressId} onValueChange={(id) => {
            const addr = addresses.find(a => a.id === id);
            if (addr) handleSelectAddress(addr);
          }}>
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedAddressId === addr.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelectAddress(addr)}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value={addr.id} id={addr.id} className="mt-1" />
                  <Label htmlFor={addr.id} className="flex-1 cursor-pointer">
                    <div className="space-y-1">
                      <p className="font-medium">
                        {addr.street}, {addr.number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {addr.neighborhood} - {addr.city}/{addr.state}
                      </p>
                      {addr.complement && (
                        <p className="text-sm text-muted-foreground">
                          {addr.complement}
                        </p>
                      )}
                      {addr.reference_point && (
                        <p className="text-sm text-muted-foreground">
                          Ref: {addr.reference_point}
                        </p>
                      )}
                      {addr.is_default && (
                        <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-2">
                          Padrão
                        </span>
                      )}
                    </div>
                  </Label>
                  {selectedAddressId === addr.id && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}
