import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { LoadingSpinner } from './LoadingSpinner';

interface NeighborhoodSelectorProps {
  selectedNeighborhood: string;
  onSelect: (neighborhood: string, deliveryFee: number) => void;
}

export const NeighborhoodSelector = ({ selectedNeighborhood, onSelect }: NeighborhoodSelectorProps) => {
  const { zones, isLoading } = useDeliveryZones();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState(selectedNeighborhood);

  const filteredZones = zones.filter(zone =>
    zone.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    const zone = zones.find(z => z.neighborhood === tempSelected);
    if (zone) {
      onSelect(zone.neighborhood, zone.delivery_fee);
      setOpen(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {selectedNeighborhood || 'Selecione seu bairro'}
          </div>
          {selectedNeighborhood && zones.find(z => z.neighborhood === selectedNeighborhood) && (
            <span className="text-sm font-medium">
              {formatPrice(zones.find(z => z.neighborhood === selectedNeighborhood)?.delivery_fee || 0)}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecione seu bairro</DialogTitle>
          <DialogDescription>
            A taxa de entrega varia de acordo com o bairro
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              <RadioGroup value={tempSelected} onValueChange={setTempSelected}>
                {filteredZones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum bairro encontrado
                  </div>
                ) : (
                  filteredZones.map((zone) => (
                    <div
                      key={zone.id}
                      className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setTempSelected(zone.neighborhood)}
                    >
                      <RadioGroupItem value={zone.neighborhood} id={zone.id} />
                      <Label htmlFor={zone.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{zone.neighborhood}</div>
                            <div className="text-xs text-muted-foreground">
                              Entrega em ~{zone.estimated_time} min
                            </div>
                          </div>
                          <div className="font-medium text-primary">
                            {formatPrice(zone.delivery_fee)}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </RadioGroup>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={!tempSelected}
              >
                Confirmar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
