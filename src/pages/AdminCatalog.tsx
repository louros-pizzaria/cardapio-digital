import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminCategorySidebar } from '@/components/AdminCategorySidebar';
import { AdminCatalogProducts } from '@/components/AdminCatalogProducts';
import { AdminCatalogExtras } from '@/components/AdminCatalogExtras';
import { AdminCatalogConfig } from '@/components/AdminCatalogConfig';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { Package } from 'lucide-react';

const AdminCatalog = () => {
  const {
    categories,
    selectedCategory,
    selectedSubcategory,
    products,
    loading,
    selectCategory,
    selectSubcategory,
    clearSelection,
  } = useAdminCatalog();

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Gerenciar Catálogo
          </h1>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        <AdminCategorySidebar
          categories={categories}
          selectedCategoryId={selectedCategory?.id || null}
          selectedSubcategoryId={selectedSubcategory?.id || null}
          onSelectCategory={selectCategory}
          onSelectSubcategory={selectSubcategory}
          onClearSelection={clearSelection}
        />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-6">
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="products">Produtos</TabsTrigger>
                <TabsTrigger value="extras">Extras</TabsTrigger>
                <TabsTrigger value="config">Configurações</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-6">
                <AdminCatalogProducts
                  products={products}
                  selectedCategoryName={selectedCategory?.name}
                  selectedSubcategoryName={selectedSubcategory?.name}
                />
              </TabsContent>

              <TabsContent value="extras" className="mt-6">
                <AdminCatalogExtras />
              </TabsContent>

              <TabsContent value="config" className="mt-6">
                <AdminCatalogConfig />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminCatalog;
