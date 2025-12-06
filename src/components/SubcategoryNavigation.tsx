
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  order_position: number | null;
  is_active: boolean | null;
  created_at: string | null;
  product_count: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  subcategories: Subcategory[];
}

interface SubcategoryNavigationProps {
  categories: Category[];
  onSubcategorySelect: (categoryId: string, subcategoryId: string) => void;
  onBackToCategories: () => void;
  selectedCategoryId?: string;
}

export const SubcategoryNavigation = ({ 
  categories, 
  onSubcategorySelect, 
  onBackToCategories,
  selectedCategoryId 
}: SubcategoryNavigationProps) => {
  if (selectedCategoryId) {
    const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
    
    if (!selectedCategory) {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={onBackToCategories}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            {selectedCategory.icon && <span className="text-2xl">{selectedCategory.icon}</span>}
            <h2 className="text-2xl font-bold text-pizza-dark">{selectedCategory.name}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectedCategory.subcategories.map((subcategory) => (
            <Card 
              key={subcategory.id}
              className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              onClick={() => onSubcategorySelect(selectedCategory.id, subcategory.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg group-hover:text-pizza-red transition-colors">
                    {subcategory.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {subcategory.product_count} {subcategory.product_count === 1 ? 'item' : 'itens'}
                  </Badge>
                </div>
                {subcategory.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {subcategory.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-end">
                  <ChevronRight className="h-4 w-4 text-pizza-red" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-pizza-dark">Escolha uma Categoria</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card 
            key={category.id}
            className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => onSubcategorySelect(category.id, '')}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {category.icon && <span className="text-3xl">{category.icon}</span>}
                <CardTitle className="text-xl">{category.name}</CardTitle>
              </div>
              {category.description && (
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              )}
              <Badge variant="secondary" className="w-fit">
                {category.subcategories.length} subcategorias
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-end">
                <ChevronRight className="h-4 w-4 text-pizza-red" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
