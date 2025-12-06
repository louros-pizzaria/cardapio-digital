import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { OptimizedImage } from '@/components/OptimizedImage';

interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isActive: boolean;
}

interface Props {
  product: Product;
  onEdit: (product: Product) => void;
}

export function ProdutoCard({ product, onEdit }: Props) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagem */}
      <div className="aspect-video bg-muted relative">
        <OptimizedImage
          src={product.image}
          alt={product.name}
          className="w-full h-full"
          lazy={true}
        />
        <Badge
          variant={product.isActive ? 'default' : 'secondary'}
          className="absolute top-2 right-2"
        >
          {product.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Código: {product.code}</p>
              <h3 className="font-semibold truncate">{product.name}</h3>
            </div>
            <Switch checked={product.isActive} />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">
            R$ {product.price.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(product)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
