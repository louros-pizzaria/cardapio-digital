import { memo, useMemo } from "react";
import { MenuCategory } from "@/components/MenuCategory";
import { MenuSearch } from "@/components/MenuSearch";
import { SubcategoryNavigation } from "@/components/SubcategoryNavigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

// ===== COMPONENTE OTIMIZADO PARA CONTEÚDO DO MENU =====

interface OptimizedMenuContentProps {
  currentView: string;
  categories: any[];
  products: any[];
  searchTerm: string;
  selectedCategoryId: string;
  handleSubcategorySelect: (categoryId: string, subcategoryId: string) => void;
  handleBackToCategories: () => void;
  handleBackToSubcategories: () => void;
  getCurrentCategoryName: () => string;
  getCurrentSubcategoryName: () => string;
  onSearchChange: (value: string) => void;
}

export const OptimizedMenuContent = memo(({
  currentView,
  categories,
  products,
  searchTerm,
  selectedCategoryId,
  handleSubcategorySelect,
  handleBackToCategories,
  handleBackToSubcategories,
  getCurrentCategoryName,
  getCurrentSubcategoryName,
  onSearchChange
}: OptimizedMenuContentProps) => {
  // Filter products com useMemo para otimização
  const filteredProducts = useMemo(() => 
    products.filter((product: any) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [products, searchTerm]
  );

  // Memoizar componentes pesados
  const navigationComponent = useMemo(() => (
    <SubcategoryNavigation
      categories={categories}
      onSubcategorySelect={handleSubcategorySelect}
      onBackToCategories={handleBackToCategories}
      selectedCategoryId={currentView === 'subcategories' ? selectedCategoryId : undefined}
    />
  ), [categories, handleSubcategorySelect, handleBackToCategories, currentView, selectedCategoryId]);

  switch (currentView) {
    case 'categories':
    case 'subcategories':
      return navigationComponent;
    
    case 'products':
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToSubcategories}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar para {getCurrentCategoryName()}
            </Button>
          </div>

          <MenuSearch
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
          />

          <MenuCategory
            title={getCurrentSubcategoryName()}
            items={filteredProducts.map((product: any) => ({
              ...product,
              image: product.image_url || "",
              category: getCurrentSubcategoryName()
            }))}
            icon="🍽️"
          />
        </div>
      );
    
    default:
      return null;
  }
});