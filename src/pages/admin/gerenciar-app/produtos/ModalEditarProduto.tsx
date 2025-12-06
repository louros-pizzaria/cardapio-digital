import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
  product: any;
  categoryId: string | null;
  subcategoryId: string | null;
}

export function ModalEditarProduto({ open, onClose, product, categoryId, subcategoryId }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Buscar nome da categoria para exibir
  const { data: category } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && open,
  });

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price?.toString() || '');
      setImageUrl(product.image || '');
      setIsActive(product.isActive ?? true);
    } else {
      // Novo produto
      setName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
      setIsActive(true);
    }
  }, [product, open]);

  const handleSave = async () => {
    if (!name || !price) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (!categoryId && !product) {
      toast.error('Selecione uma categoria');
      return;
    }

    setIsSaving(true);
    try {
      const productData = {
        name,
        description,
        price: parseFloat(price),
        image_url: imageUrl,
        is_available: isActive,
        category_id: product?.category_id || categoryId,
        subcategory_id: product?.subcategory_id || subcategoryId,
      };

      console.debug('Salvando produto:', { 
        productData, 
        isEdit: !!product?.id,
        categoryId,
        subcategoryId 
      });

      if (product?.id) {
        // Atualizar produto existente
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) {
          if (error.message.includes('permission')) {
            throw new Error('Sem permissão. Verifique se você tem papel de admin.');
          }
          throw error;
        }
        console.debug('Produto atualizado:', product.id);
        toast.success('Produto atualizado com sucesso!');
      } else {
        // Criar novo produto
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select();

        if (error) {
          if (error.message.includes('permission')) {
            throw new Error('Sem permissão. Verifique se você tem papel de admin.');
          }
          throw error;
        }
        console.debug('Produto criado:', data);
        toast.success('Produto criado com sucesso!');
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || 'Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Atualize as informações do produto' : 'Adicione um novo produto ao cardápio'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Indicador de localização */}
          {(categoryId || subcategoryId) && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Local: </span>
                {category?.name || 'Categoria'}
                {subcategoryId && ' > Subcategoria selecionada'}
              </p>
            </div>
          )}
          {/* Status */}
          <div className="flex items-center space-x-2">
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active">Produto disponível para venda</Label>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Produto *</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pizza Margherita"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os ingredientes e características..."
              rows={3}
            />
          </div>

          {/* Preço */}
          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Imagem */}
          <div className="space-y-2">
            <Label htmlFor="image">URL da Imagem</Label>
            <Input 
              id="image" 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          {/* Preview da imagem */}
          {imageUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={name || 'Preview'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
