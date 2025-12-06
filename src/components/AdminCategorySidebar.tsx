import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface AdminCategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSelectSubcategory: (subcategoryId: string, categoryId: string) => void;
  onClearSelection: () => void;
}

export const AdminCategorySidebar = ({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onSelectSubcategory,
  onClearSelection,
}: AdminCategorySidebarProps) => {
  return (
    <div className="w-64 border-r bg-card h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Package className="w-5 h-5" />
          Categorias
        </h2>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-2">
          <Button
            variant={!selectedCategoryId ? "secondary" : "ghost"}
            className="w-full justify-start mb-2"
            onClick={onClearSelection}
          >
            Todos os produtos
          </Button>

          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            const hasSubcategories = category.subcategories && category.subcategories.length > 0;

            return (
              <div key={category.id} className="mb-1">
                <Button
                  variant={isSelected && !selectedSubcategoryId ? "secondary" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => onSelectCategory(category.id)}
                >
                  <span className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
                  </span>
                  {hasSubcategories && (
                    isSelected ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                  )}
                </Button>

                {isSelected && hasSubcategories && (
                  <div className="ml-4 mt-1 space-y-1">
                    {category.subcategories!.map((subcategory) => (
                      <Button
                        key={subcategory.id}
                        variant={selectedSubcategoryId === subcategory.id ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => onSelectSubcategory(subcategory.id, category.id)}
                      >
                        {subcategory.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
