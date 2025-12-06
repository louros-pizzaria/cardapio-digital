
import { MenuCard } from './MenuCard';
import { Badge } from '@/components/ui/badge';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  ingredients?: string[];
}

interface MenuCategoryProps {
  title: string;
  items: MenuItem[];
  icon?: string;
}

export const MenuCategory = ({ title, items, icon }: MenuCategoryProps) => {
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <h2 className="text-2xl font-bold text-pizza-dark">{title}</h2>
        </div>
        
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold text-pizza-dark mb-2">
            Nenhum produto encontrado
          </h3>
          <p className="text-muted-foreground">
            Esta categoria ainda não possui produtos disponíveis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <h2 className="text-2xl font-bold text-pizza-dark">{title}</h2>
        <Badge variant="secondary" className="ml-auto">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <MenuCard
            key={item.id}
            id={item.id}
            name={item.name}
            description={item.description}
            price={item.price}
            image={item.image}
            category={title}
            ingredients={item.ingredients}
          />
        ))}
      </div>
    </div>
  );
};
