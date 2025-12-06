import { useState, memo } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OptimizedMenuContent } from "@/components/OptimizedMenuContent";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useMenuOptimized } from "@/hooks/useMenuOptimized";
import { useUnifiedStore } from '@/stores/simpleStore';
import { useNavigate } from "react-router-dom";
import { MenuSkeleton, CategorySkeleton } from "@/components/MenuSkeleton";
import { FixedCartFooter } from "@/components/FixedCartFooter";
import { StoreStatusBanner } from "@/components/StoreStatusBanner";

// Memoized skeleton components
const MemoizedMenuSkeleton = memo(MenuSkeleton);
const MemoizedCategorySkeleton = memo(CategorySkeleton);

// Componente principal otimizado

const Menu = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { getItemCount } = useUnifiedStore();
  const navigate = useNavigate();
  
  const {
    categories,
    products,
    loading,
    currentView,
    selectedCategoryId,
    selectedSubcategoryId,
    handleSubcategorySelect,
    handleBackToCategories,
    handleBackToSubcategories,
    getCurrentCategoryName,
    getCurrentSubcategoryName
  } = useMenuOptimized();

  // Loading state otimizado com skeleton
  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="ml-auto">
                <h1 className="text-xl font-semibold">Cardápio</h1>
              </div>
            </header>
            <div className="flex-1 p-6 space-y-6 pb-20">
              {currentView === 'products' ? <MemoizedMenuSkeleton /> : <MemoizedCategorySkeleton />}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto">
              <h1 className="text-xl font-semibold">Cardápio</h1>
            </div>
          </header>
          <div className="flex-1 p-6 space-y-6 pb-20">
            <StoreStatusBanner />
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-pizza-dark mb-2">
                  Cardápio 🍕
                </h1>
                <p className="text-muted-foreground">
                  {currentView === 'categories' 
                    ? `${categories.length} categorias disponíveis`
                    : currentView === 'subcategories' 
                      ? `Subcategorias de ${getCurrentCategoryName()}`
                      : `${products.length} produtos disponíveis`
                  }
                </p>
              </div>
              {getItemCount() > 0 && (
                <Button 
                  onClick={() => navigate('/checkout')}
                  className="gradient-pizza text-white relative"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Carrinho ({getItemCount()})
                </Button>
              )}
            </div>

            <OptimizedMenuContent
              currentView={currentView}
              categories={categories}
              products={products}
              searchTerm={searchTerm}
              selectedCategoryId={selectedCategoryId}
              handleSubcategorySelect={handleSubcategorySelect}
              handleBackToCategories={handleBackToCategories}
              handleBackToSubcategories={handleBackToSubcategories}
              getCurrentCategoryName={getCurrentCategoryName}
              getCurrentSubcategoryName={getCurrentSubcategoryName}
              onSearchChange={setSearchTerm}
            />
          </div>
        </SidebarInset>
        
        {/* Fixed Cart Footer */}
        <FixedCartFooter />
      </div>
    </SidebarProvider>
  );
};

export default Menu;