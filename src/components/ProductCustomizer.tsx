import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUnifiedStore } from '@/stores/simpleStore';
import { CartCustomization } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useQuery } from '@tanstack/react-query';

interface ProductCustomizerProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

// Configurações dinâmicas baseadas no tipo de produto
const getProductConfig = (product: any, crustData: any[], extraData: any[]) => {
  const categoryName = product?.subcategory?.category?.name || '';
  const subcategoryName = product?.subcategory?.name || '';
  
  // Configuração específica para Pizzas Grandes e Pizzas Broto
  const isPizzaCategory = categoryName === 'Pizzas Grandes' || categoryName === 'Pizzas Broto';
  
  if (isPizzaCategory) {
    // Opções de bordas recheadas do banco de dados
    const crustOptions = [
      { id: 'tradicional', name: 'Tradicional', price: 0 },
      ...crustData.map(crust => ({
        id: crust.id,
        name: `Borda Recheada - ${crust.name}`,
        price: crust.price
      }))
    ];

    // Adicionais do banco de dados
    const extraOptions = extraData.map(extra => extra.name);
    
    // Preço diferente baseado no tamanho da pizza
    const extraPrice = categoryName === 'Pizzas Grandes' ? 4 : 3;

    return {
      showCrust: true,
      showExtras: true,
      crustOptions,
      extraOptions,
      extraPrice,
      extraData, // Passar os dados completos para ter acesso aos preços
      isPizza: true
    };
  }
  
  // Configuração para bebidas - SEM bordas recheadas nem adicionais
  const isBeverageCategory = categoryName.toLowerCase().includes('bebida') || 
                            categoryName.toLowerCase().includes('drink') ||
                            subcategoryName.toLowerCase().includes('bebida');

  if (isBeverageCategory) {
    return {
      showCrust: false,
      showExtras: false,
      showTemperature: true,
      temperatureOptions: [
        { id: 'gelada', name: 'Gelada', price: 0 },
        { id: 'natural', name: 'Natural', price: 0 },
      ],
      isBeverage: true
    };
  }
  
  // Configuração para outras categorias (lanches, etc.) - sem bordas recheadas
  const productName = product?.name?.toLowerCase() || '';
  if (categoryName.toLowerCase().includes('lanche') || 
      categoryName.toLowerCase().includes('hamburguer') || 
      productName.includes('lanche') || 
      productName.includes('hamburguer')) {
    return {
      showCrust: false,
      showExtras: true,
      extraOptions: [
        'Queijo Extra',
        'Bacon',
        'Ovo',
        'Alface',
        'Tomate',
        'Cebola',
        'Picles',
        'Molho Extra',
      ],
      extraPrice: 2
    };
  }
  
  // Configuração padrão - apenas observações e quantidade (sem bordas nem adicionais)
  return {
    showCrust: false,
    showExtras: false,
  };
};

export const ProductCustomizer = ({ product, isOpen, onClose }: ProductCustomizerProps) => {
  // Buscar bordas recheadas do banco de dados
  const { data: crustData = [] } = useQuery({
    queryKey: ['product_crusts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_crusts')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar extras do banco de dados
  const { data: extraData = [] } = useQuery({
    queryKey: ['product_extras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_extras')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const config = getProductConfig(product, crustData, extraData);
  
  const [selectedCrust, setSelectedCrust] = useState('tradicional');
  const [selectedTemperature, setSelectedTemperature] = useState('gelada');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [crustPopoverOpen, setCrustPopoverOpen] = useState(false);
  const [extrasPopoverOpen, setExtrasPopoverOpen] = useState(false);
  
  const { addItem } = useUnifiedStore();
  const { toast } = useToast();

  const resetForm = () => {
    setSelectedCrust('tradicional');
    setSelectedTemperature('gelada');
    setSelectedExtras([]);
    setNotes('');
    setQuantity(1);
    setCrustPopoverOpen(false);
    setExtrasPopoverOpen(false);
  };

  const handleExtraChange = (extra: string, checked: boolean) => {
    if (checked) {
      setSelectedExtras([...selectedExtras, extra]);
    } else {
      setSelectedExtras(selectedExtras.filter(e => e !== extra));
    }
  };

  const calculateTotalPrice = () => {
    let total = product.price * quantity;
    
    // Adicionar preço da borda (pizzas)
    if (config.showCrust && config.crustOptions) {
      const crustOption = config.crustOptions.find(c => c.id === selectedCrust);
      if (crustOption) {
        total += crustOption.price * quantity;
      }
    }
    
    // Adicionar preço dos extras
    if (config.showExtras && config.extraData) {
      // Usar preços reais do banco de dados
      selectedExtras.forEach(extraName => {
        const extra = config.extraData.find((e: any) => e.name === extraName);
        if (extra) {
          total += extra.price * quantity;
        }
      });
    }
    
    return total;
  };

  const handleAddToCart = () => {
    const customizations: CartCustomization = {};
    
    // Adicionar customizações baseadas na configuração
    if (config.showCrust && selectedCrust !== 'tradicional') {
      // Buscar o nome da borda selecionada
      const crustOption = config.crustOptions?.find(c => c.id === selectedCrust);
      
      customizations.crust = selectedCrust; // Salvar ID
      customizations.crustName = crustOption?.name; // Salvar nome também
    }
    
    if (config.showTemperature && selectedTemperature !== 'gelada') {
      customizations.extras = [...(customizations.extras || []), `Temperatura: ${selectedTemperature}`];
    }
    
    if (config.showExtras && selectedExtras.length > 0) {
      customizations.extras = selectedExtras;
      customizations.extrasNames = selectedExtras; // Garantir nomes dos extras
    }

    addItem(product, customizations, notes, quantity);
    
    toast({
      title: "Produto adicionado!",
      description: `${quantity}x ${product.name} adicionado ao carrinho.`,
    });
    
    resetForm();
    onClose();
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pizza-orange rounded-full flex items-center justify-center text-white text-sm font-bold">
              P
            </div>
            {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Imagem e descrição */}
          {product.image_url && (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}
          
          {product.description && (
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Preço base */}
          <div className="flex justify-between items-center">
            <span className="text-sm">Preço base:</span>
            <Badge variant="outline">{formatPrice(product.price)}</Badge>
          </div>

          {/* Opções de Borda Recheada (Apenas para Pizzas Grandes e Pizzas Broto) */}
          {config.showCrust && config.crustOptions && config.isPizza && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Bordas Recheadas</Label>
                <Badge variant="secondary" className="text-xs">
                  Apenas para pizzas
                </Badge>
              </div>
              <Popover open={crustPopoverOpen} onOpenChange={setCrustPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between p-4 h-auto"
                  >
                    <div className="text-left">
                      <div className="font-medium">
                        {config.crustOptions.find(c => c.id === selectedCrust)?.name || 'Selecionar borda'}
                      </div>
                      {selectedCrust !== 'tradicional' && (
                        <div className="text-sm text-muted-foreground">
                          +{formatPrice(config.crustOptions.find(c => c.id === selectedCrust)?.price || 0)}
                        </div>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-center mb-3 text-muted-foreground">
                      Escolha sua borda recheada
                    </div>
                    <RadioGroup value={selectedCrust} onValueChange={setSelectedCrust}>
                      {config.crustOptions.map((crust) => (
                        <div key={crust.id} className="flex items-center space-x-3 p-3 hover:bg-accent rounded-lg border transition-colors">
                          <RadioGroupItem value={crust.id} id={crust.id} />
                          <Label htmlFor={crust.id} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{crust.name}</div>
                                {crust.id === 'tradicional' && (
                                  <div className="text-xs text-muted-foreground">Massa tradicional</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`font-semibold ${crust.price > 0 ? 'text-pizza-orange' : 'text-green-600'}`}>
                                  {crust.price > 0 ? `+${formatPrice(crust.price)}` : 'Grátis'}
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Opções de Temperatura (Bebidas) */}
          {config.showTemperature && config.temperatureOptions && (
            <div className="space-y-2">
              <Label>Temperatura</Label>
              <RadioGroup value={selectedTemperature} onValueChange={setSelectedTemperature}>
                {config.temperatureOptions.map((temp) => (
                  <div key={temp.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={temp.id} id={temp.id} />
                    <Label htmlFor={temp.id} className="flex-1 cursor-pointer">
                      {temp.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Adicionais (Apenas para Pizzas e alguns outros produtos) */}
          {config.showExtras && config.extraOptions && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">Adicionais</Label>
                {config.isPizza && (
                  <Badge variant="secondary" className="text-xs">
                    Para pizzas
                  </Badge>
                )}
              </div>
              <Popover open={extrasPopoverOpen} onOpenChange={setExtrasPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between p-4 h-auto"
                  >
                    <div className="text-left">
                      <div className="font-medium">
                        {selectedExtras.length === 0 
                          ? 'Selecionar adicionais' 
                          : `${selectedExtras.length} ${selectedExtras.length === 1 ? 'adicional selecionado' : 'adicionais selecionados'}`
                        }
                      </div>
                      {selectedExtras.length > 0 && config.extraData && (
                        <div className="text-sm text-muted-foreground">
                          +{formatPrice(selectedExtras.reduce((sum, extraName) => {
                            const extra = config.extraData.find((e: any) => e.name === extraName);
                            return sum + (extra?.price || 0);
                          }, 0))}
                        </div>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-h-96 overflow-y-auto">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-center mb-3 text-muted-foreground">
                      Escolha seus adicionais
                    </div>
                     <div className="grid gap-2">
                      {config.extraOptions.map((extra) => {
                        const extraItem = config.extraData?.find((e: any) => e.name === extra);
                        const extraPrice = extraItem?.price || 0;
                        
                        return (
                          <div key={extra} className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg border transition-colors">
                            <Checkbox
                              id={extra}
                              checked={selectedExtras.includes(extra)}
                              onCheckedChange={(checked) => handleExtraChange(extra, checked as boolean)}
                            />
                            <Label htmlFor={extra} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{extra}</span>
                                <span className="text-sm font-semibold text-pizza-orange">
                                  +{formatPrice(extraPrice)}
                                </span>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {selectedExtras.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Adicionais selecionados:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedExtras.map((extra) => {
                      const extraItem = config.extraData?.find((e: any) => e.name === extra);
                      const extraPrice = extraItem?.price || 0;
                      
                      return (
                        <Badge key={extra} variant="secondary" className="text-xs">
                          {extra} <span className="ml-1 text-pizza-orange">+{formatPrice(extraPrice)}</span>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: sem cebola, bem passado, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Total e botões */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span className="text-pizza-orange">{formatPrice(calculateTotalPrice())}</span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleAddToCart} className="flex-1 gradient-pizza">
                Adicionar ao Carrinho
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};