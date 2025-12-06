import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarCategorias } from './SidebarCategorias';
import { PainelProdutos } from './PainelProdutos';
import { Extras } from './Extras';
import { Configuracoes } from './Configuracoes';
import { AdminProductCrusts } from '@/components/AdminProductCrusts';

export default function GerenciarAppProdutos() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  return (
    <div className="flex gap-6">
      {/* Sidebar de categorias */}
      <div className="w-64 flex-shrink-0">
        <SidebarCategorias
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          onSelectCategory={setSelectedCategory}
          onSelectSubcategory={setSelectedSubcategory}
        />
      </div>

      {/* Painel principal com abas */}
      <div className="flex-1">
        <Tabs defaultValue="produtos" className="w-full">
          <TabsList>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
            <TabsTrigger value="bordas">Bordas Recheadas</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="produtos" className="mt-6">
            <PainelProdutos
              categoryId={selectedCategory}
              subcategoryId={selectedSubcategory}
            />
          </TabsContent>

          <TabsContent value="extras" className="mt-6">
            <Extras />
          </TabsContent>

          <TabsContent value="bordas" className="mt-6">
            <AdminProductCrusts />
          </TabsContent>

          <TabsContent value="configuracoes" className="mt-6">
            <Configuracoes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
