// ===== GESTÃO DE ADICIONAIS DE PRODUTOS =====

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductExtra {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export const AdminProductExtras = () => {
  const [extras, setExtras] = useState<ProductExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ProductExtra | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchExtras();
  }, []);

  const fetchExtras = async () => {
    try {
      const { data, error } = await supabase
        .from('product_extras')
        .select('*')
        .order('name');

      if (error) throw error;
      setExtras(data || []);
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error);
      toast.error('Erro ao carregar adicionais');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (extra?: ProductExtra) => {
    if (extra) {
      setEditingExtra(extra);
      setName(extra.name);
      setPrice(extra.price.toString());
      setIsActive(extra.is_active);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingExtra(null);
    setName("");
    setPrice("");
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!name || !price) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      if (editingExtra) {
        const { error } = await supabase
          .from('product_extras')
          .update({
            name,
            price: Number(price),
            is_active: isActive
          })
          .eq('id', editingExtra.id);

        if (error) throw error;
        toast.success('Adicional atualizado!');
      } else {
        const { error } = await supabase
          .from('product_extras')
          .insert({
            name,
            price: Number(price),
            is_active: isActive
          });

        if (error) throw error;
        toast.success('Adicional criado!');
      }

      setDialogOpen(false);
      resetForm();
      fetchExtras();
    } catch (error: any) {
      console.error('Erro ao salvar adicional:', error);
      toast.error(error.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este adicional?')) return;

    try {
      const { error } = await supabase
        .from('product_extras')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Adicional excluído!');
      fetchExtras();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    }
  };

  const toggleActive = async (extra: ProductExtra) => {
    setTogglingId(extra.id);
    try {
      const { error } = await supabase
        .from('product_extras')
        .update({ is_active: !extra.is_active })
        .eq('id', extra.id);

      if (error) {
        console.error('Erro ao atualizar extra:', error);
        if (error.message.includes('row-level security')) {
          toast.error('Você não tem permissão para atualizar extras');
        } else {
          toast.error(`Erro ao atualizar: ${error.message}`);
        }
        throw error;
      }
      
      toast.success(extra.is_active ? 'Extra desativado!' : 'Extra ativado!');
      fetchExtras();
    } catch (error: any) {
      console.error('Erro detalhado:', error);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          Adicionais
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Adicional
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExtra ? 'Editar Adicional' : 'Novo Adicional'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="extra-name">Nome *</Label>
                <Input
                  id="extra-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Bacon"
                />
              </div>
              <div>
                <Label htmlFor="extra-price">Valor (R$) *</Label>
                <Input
                  id="extra-price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 5.00"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="extra-active">Ativo</Label>
                <Switch
                  id="extra-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : extras.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum adicional cadastrado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extras.map((extra) => (
                <TableRow key={extra.id}>
                  <TableCell className="font-medium">{extra.name}</TableCell>
                  <TableCell>R$ {extra.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={extra.is_active ? 'default' : 'secondary'}>
                      {extra.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(extra)}
                      disabled={togglingId === extra.id}
                    >
                      {togglingId === extra.id ? 'Processando...' : extra.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(extra)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(extra.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
