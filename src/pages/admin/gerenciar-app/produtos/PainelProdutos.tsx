import { Button } from '@/components/ui/button';
import { Upload, Plus } from 'lucide-react';
import { ProdutoCard } from './ProdutoCard';
import { ModalImportar } from './ModalImportar';
import { ModalEditarProduto } from './ModalEditarProduto';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  categoryId: string | null;
  subcategoryId: string | null;
}

export function PainelProdutos({ categoryId, subcategoryId }: Props) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', categoryId, subcategoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      console.debug('Buscando produtos:', { categoryId, subcategoryId });
      
      let query = supabase
        .from('products')
        .select('*');
      
      if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
      } else {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      
      if (error) throw error;
      
      console.debug('Produtos encontrados:', data?.length);
      return data;
    },
    enabled: !!categoryId,
  });

  const { data: category } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setEditModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setSelectedProduct(null);
    refetch();
  };

  return (
    <div>
      {/* Header com ações */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Produtos</h2>
          <p className="text-muted-foreground text-sm">
            {category ? `Categoria: ${category.name}` : 'Selecione uma categoria'}
          </p>
        </div>
        {categoryId && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        )}
      </div>

      {/* Grid de produtos */}
      {categoryId ? (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProdutoCard
                key={product.id}
                product={{
                  id: product.id,
                  code: product.id.substring(0, 8),
                  name: product.name,
                  description: product.description || '',
                  price: Number(product.price),
                  image: product.image_url || '/placeholder.svg',
                  isActive: product.is_available,
                }}
                onEdit={handleEdit}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum produto nesta categoria</p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Produto
            </Button>
          </div>
        )
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Selecione uma categoria para visualizar os produtos
        </div>
      )}

      {/* Modais */}
      <ModalImportar open={importModalOpen} onClose={() => setImportModalOpen(false)} />
      <ModalEditarProduto
        open={editModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        categoryId={categoryId}
        subcategoryId={subcategoryId}
      />
    </div>
  );
}
