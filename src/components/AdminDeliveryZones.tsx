// ===== GESTÃO DE ZONAS DE ENTREGA =====

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeliveryZone {
  id: string;
  neighborhood: string;
  delivery_fee: number;
  estimated_time: number;
  is_active: boolean;
}

export const AdminDeliveryZones = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // Form state
  const [neighborhood, setNeighborhood] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("45");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('neighborhood');

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Erro ao carregar zonas:', error);
      toast.error('Erro ao carregar zonas de entrega');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setNeighborhood(zone.neighborhood);
      setDeliveryFee(zone.delivery_fee.toString());
      setEstimatedTime(zone.estimated_time.toString());
      setIsActive(zone.is_active);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingZone(null);
    setNeighborhood("");
    setDeliveryFee("");
    setEstimatedTime("45");
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!neighborhood || !deliveryFee) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingZone) {
        const { error } = await supabase
          .from('delivery_zones')
          .update({
            neighborhood,
            delivery_fee: Number(deliveryFee),
            estimated_time: Number(estimatedTime),
            is_active: isActive
          })
          .eq('id', editingZone.id);

        if (error) throw error;
        toast.success('Zona atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('delivery_zones')
          .insert({
            neighborhood,
            delivery_fee: Number(deliveryFee),
            estimated_time: Number(estimatedTime),
            is_active: isActive
          });

        if (error) throw error;
        toast.success('Zona criada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchZones();
    } catch (error: any) {
      console.error('Erro ao salvar zona:', error);
      toast.error(error.message || 'Erro ao salvar zona');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta zona?')) return;

    try {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Zona excluída com sucesso!');
      fetchZones();
    } catch (error: any) {
      console.error('Erro ao excluir zona:', error);
      toast.error(error.message || 'Erro ao excluir zona');
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    try {
      const { error } = await supabase
        .from('delivery_zones')
        .update({ is_active: !zone.is_active })
        .eq('id', zone.id);

      if (error) throw error;
      toast.success(zone.is_active ? 'Zona desativada' : 'Zona ativada');
      fetchZones();
    } catch (error: any) {
      console.error('Erro ao atualizar zona:', error);
      toast.error('Erro ao atualizar zona');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Áreas de Entrega
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Área
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Editar Área de Entrega' : 'Nova Área de Entrega'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro"
                />
              </div>
              <div>
                <Label htmlFor="delivery-fee">Taxa de Entrega (R$) *</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  step="0.01"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="Ex: 5.00"
                />
              </div>
              <div>
                <Label htmlFor="estimated-time">Tempo Estimado (minutos)</Label>
                <Input
                  id="estimated-time"
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="Ex: 45"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is-active">Ativo</Label>
                <Switch
                  id="is-active"
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
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : zones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma área de entrega cadastrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bairro</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Tempo Est.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.neighborhood}</TableCell>
                  <TableCell>R$ {zone.delivery_fee.toFixed(2)}</TableCell>
                  <TableCell>{zone.estimated_time} min</TableCell>
                  <TableCell>
                    <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                      {zone.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(zone)}
                    >
                      {zone.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(zone)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(zone.id)}
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
