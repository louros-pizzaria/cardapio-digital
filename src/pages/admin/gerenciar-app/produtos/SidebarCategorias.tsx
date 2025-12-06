import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { ModalAdicionarCategoria } from './ModalAdicionarCategoria';

interface Props {
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  onSelectCategory: (id: string) => void;
  onSelectSubcategory: (id: string | null) => void;
}

export function SidebarCategorias({
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  onSelectSubcategory,
}: Props) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);

  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCategorySubcategories = (categoryId: string) => {
    return subcategories?.filter(sub => sub.category_id === categoryId) || [];
  };

  const handleCategoryClick = (categoryId: string) => {
    const categorySubs = getCategorySubcategories(categoryId);
    onSelectCategory(categoryId);
    
    // Se tem subcategorias, seleciona automaticamente a primeira
    if (categorySubs.length > 0) {
      onSelectSubcategory(categorySubs[0].id);
    } else {
      onSelectSubcategory(null);
    }
    
    toggleCategory(categoryId);
  };

  const handleSubcategoryClick = (subcategoryId: string, categoryId: string) => {
    onSelectCategory(categoryId);
    onSelectSubcategory(subcategoryId);
  };

  const openAddCategoryModal = () => {
    setModalParentId(null);
    setModalOpen(true);
  };

  const openAddSubcategoryModal = (categoryId: string) => {
    setModalParentId(categoryId);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Categorias</h3>
          <Button variant="outline" size="sm" className="w-full" onClick={openAddCategoryModal}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Categoria
          </Button>
        </div>

        <div className="space-y-1">
          {categories?.map((category) => {
            const categorySubs = getCategorySubcategories(category.id);
            const isExpanded = expandedCategories.includes(category.id);
            
            return (
              <div key={category.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-between',
                    selectedCategory === category.id && !selectedSubcategory && 'bg-accent'
                  )}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <span className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    {category.name}
                  </span>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </Button>

                {/* Subcategorias */}
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {categorySubs.map((sub) => (
                      <Button
                        key={sub.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'w-full justify-start text-sm',
                          selectedSubcategory === sub.id && 'bg-accent'
                        )}
                        onClick={() => handleSubcategoryClick(sub.id, category.id)}
                      >
                        {sub.name}
                      </Button>
                    ))}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm text-muted-foreground"
                      onClick={() => openAddSubcategoryModal(category.id)}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Adicionar Subcategoria
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {categories?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma categoria cadastrada
          </p>
        )}
      </Card>

      <ModalAdicionarCategoria
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refetch}
        parentCategoryId={modalParentId}
      />
    </>
  );
}
