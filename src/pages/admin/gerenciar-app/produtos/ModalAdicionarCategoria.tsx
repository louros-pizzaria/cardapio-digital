import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/services/supabase';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentCategoryId?: string | null;
}

export function ModalAdicionarCategoria({ open, onClose, onSuccess, parentCategoryId }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (parentCategoryId) {
        // Adicionar subcategoria
        const { error } = await supabase
          .from('subcategories')
          .insert({
            name: formData.name,
            description: formData.description,
            category_id: parentCategoryId,
            is_active: true,
            order_position: 0,
          });

        if (error) throw error;
        toast.success('Subcategoria criada com sucesso!');
      } else {
        // Adicionar categoria principal
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            is_active: true,
            order_position: 0,
          });

        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }

      setFormData({ name: '', description: '', icon: '' });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {parentCategoryId ? 'Adicionar Subcategoria' : 'Adicionar Categoria'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Pizzas Grandes"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional"
                rows={3}
              />
            </div>

            {!parentCategoryId && (
              <div className="space-y-2">
                <Label htmlFor="icon">Ícone (emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🍕"
                  maxLength={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
