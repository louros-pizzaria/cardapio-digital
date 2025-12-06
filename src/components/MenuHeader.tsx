
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Home } from "lucide-react";
import { UnifiedCartSystem } from "./UnifiedCartSystem";
import { CurrentView } from "@/types";

interface MenuHeaderProps {
  currentView: CurrentView;
  getCurrentCategoryName: () => string;
  getCurrentSubcategoryName: () => string;
  handleBackToCategories: () => void;
  productsCount?: number;
}

export const MenuHeader = ({
  currentView,
  getCurrentCategoryName,
  getCurrentSubcategoryName,
  handleBackToCategories,
  productsCount = 0
}: MenuHeaderProps) => {
  return (
    <div className="flex items-center gap-4 mb-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {currentView !== 'categories' && (
            <>
              <Button variant="ghost" onClick={handleBackToCategories} className="p-1">
                <Home className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{getCurrentCategoryName()}</span>
              {currentView === 'products' && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium">{getCurrentSubcategoryName()}</span>
                </>
              )}
            </>
          )}
        </div>
        <h1 className="text-3xl font-bold text-pizza-dark mb-2">
          {currentView === 'categories' && "Cardápio Exclusivo 🍕"}
          {currentView === 'subcategories' && `${getCurrentCategoryName()}`}
          {currentView === 'products' && `${getCurrentSubcategoryName()}`}
        </h1>
        <p className="text-muted-foreground">
          {currentView === 'categories' && "Escolha uma categoria para começar"}
          {currentView === 'subcategories' && "Selecione uma subcategoria"}
          {currentView === 'products' && `${productsCount} ${productsCount === 1 ? 'produto encontrado' : 'produtos encontrados'}`}
        </p>
      </div>
      <UnifiedCartSystem variant="drawer" />
    </div>
  );
};
