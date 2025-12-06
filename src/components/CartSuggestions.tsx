
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useUnifiedStore } from '@/stores/simpleStore';
import { useToast } from '@/hooks/use-toast';

const SUGGESTIONS = [
  {
    id: 'coca-cola',
    name: 'Coca-Cola 350ml',
    price: 5.90,
    image: null
  },
  {
    id: 'agua',
    name: 'Água Mineral 500ml',
    price: 3.50,
    image: null
  },
  {
    id: 'suco-laranja',
    name: 'Suco de Laranja Natural',
    price: 8.90,
    image: null
  }
];

export const CartSuggestions = () => {
  const { addItem } = useUnifiedStore();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleAddSuggestion = (suggestion: any) => {
    addItem({
      id: suggestion.id,
      name: suggestion.name,
      price: suggestion.price,
      image_url: suggestion.image
    });

    toast({
      title: "Produto adicionado!",
      description: `${suggestion.name} foi adicionado à sua sacola.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Que tal levar também?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {SUGGESTIONS.map((suggestion) => (
            <div key={suggestion.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pizza-cream to-pizza-orange/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🥤</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">{suggestion.name}</h4>
                  <p className="text-pizza-red font-medium">{formatPrice(suggestion.price)}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleAddSuggestion(suggestion)}
                className="gradient-pizza text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
