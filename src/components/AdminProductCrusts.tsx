// ===== GESTÃO DE BORDAS RECHEADAS =====

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Pizza } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductCrust {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export const AdminProductCrusts = () => {
  const [crusts, setCrusts] = useState<ProductCrust[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCrust, setEditingCrust] = useState<ProductCrust | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchCrusts();
  }, []);

  const fetchCrusts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_crusts')
        .select('*')
        .order('name');

      if (error) throw error;
      setCrusts(data || []);
    } catch (error) {
      console.error('Erro ao carregar bordas:', error);
      toast.error('Erro ao carregar bordas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (crust?: ProductCrust) => {
    if (crust) {
      setEditingCrust(crust);
      setName(crust.name);
      setPrice(crust.price.toString());
      setIsActive(crust.is_active);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCrust(null);
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
      if (editingCrust) {
        const { error } = await supabase
          .from('product_crusts')
          .update({
            name,
            price: Number(price),
            is_active: isActive
          })
          .eq('id', editingCrust.id);

        if (error) throw error;
        toast.success('Borda atualizada!');
      } else {
        const { error } = await supabase
          .from('product_crusts')
          .insert({
            name,
            price: Number(price),
            is_active: isActive
          });

        if (error) throw error;
        toast.success('Borda criada!');
      }

      setDialogOpen(false);
      resetForm();
      fetchCrusts();
    } catch (error: any) {
      console.error('Erro ao salvar borda:', error);
      toast.error(error.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta borda?')) return;

    try {
      const { error } = await supabase
        .from('product_crusts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Borda excluída!');
      fetchCrusts();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir');
    }
  };

  const toggleActive = async (crust: ProductCrust) => {
    setTogglingId(crust.id);
    try {
      const { error } = await supabase
        .from('product_crusts')
        .update({ is_active: !crust.is_active })
        .eq('id', crust.id);

      if (error) {
        console.error('Erro ao atualizar borda:', error);
        if (error.message.includes('row-level security')) {
          toast.error('Você não tem permissão para atualizar bordas');
        } else {
          toast.error(`Erro ao atualizar: ${error.message}`);
        }
        throw error;
      }
      
      toast.success(crust.is_active ? 'Borda desativada!' : 'Borda ativada!');
      fetchCrusts();
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
          <Pizza className="h-5 w-5" />
          Bordas Recheadas
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Borda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCrust ? 'Editar Borda' : 'Nova Borda Recheada'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="crust-name">Nome *</Label>
                <Input
                  id="crust-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Catupiry"
                />
              </div>
              <div>
                <Label htmlFor="crust-price">Valor (R$) *</Label>
                <Input
                  id="crust-price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 8.00"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="crust-active">Ativo</Label>
                <Switch
                  id="crust-active"
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
        ) : crusts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma borda cadastrada
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
              {crusts.map((crust) => (
                <TableRow key={crust.id}>
                  <TableCell className="font-medium">{crust.name}</TableCell>
                  <TableCell>R$ {crust.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={crust.is_active ? 'default' : 'secondary'}>
                      {crust.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(crust)}
                      disabled={togglingId === crust.id}
                    >
                      {togglingId === crust.id ? 'Processando...' : crust.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(crust)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(crust.id)}
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
