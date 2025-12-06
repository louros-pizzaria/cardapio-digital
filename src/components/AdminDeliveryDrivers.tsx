import { useState, useRef } from 'react';
import { useDeliveryDrivers, DeliveryDriver } from '@/hooks/useDeliveryDrivers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bike, Plus, Pencil, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { FormattedInput } from '@/components/FormattedInput';
import { useToast } from '@/hooks/use-toast';

export function AdminDeliveryDrivers() {
  const { 
    drivers, 
    isLoading, 
    addDriver, 
    updateDriver, 
    deleteDriver, 
    toggleDriverStatus,
    uploadDriverPhoto,
    deleteDriverPhoto,
    isAddingDriver,
    isUpdatingDriver
  } = useDeliveryDrivers();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<DeliveryDriver | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    motorcycle_model: '',
    license_plate: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      motorcycle_model: '',
      license_plate: '',
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingDriver(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenDialog = (driver?: DeliveryDriver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        phone: driver.phone,
        motorcycle_model: driver.motorcycle_model,
        license_plate: driver.license_plate,
      });
      setPhotoPreview(driver.photo_url);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setTimeout(resetForm, 200);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem (JPG, PNG, WEBP).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const validateForm = (): boolean => {
    const { name, phone, motorcycle_model, license_plate } = formData;

    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, preencha o nome do motoboy.',
        variant: 'destructive',
      });
      return false;
    }

    if (!phone.trim()) {
      toast({
        title: 'Telefone obrigatório',
        description: 'Por favor, preencha o telefone.',
        variant: 'destructive',
      });
      return false;
    }

    // Validate phone format
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({
        title: 'Telefone inválido',
        description: 'O telefone deve ter 10 ou 11 dígitos.',
        variant: 'destructive',
      });
      return false;
    }

    if (!motorcycle_model.trim()) {
      toast({
        title: 'Modelo da moto obrigatório',
        description: 'Por favor, preencha o modelo da moto.',
        variant: 'destructive',
      });
      return false;
    }

    if (!license_plate.trim()) {
      toast({
        title: 'Placa obrigatória',
        description: 'Por favor, preencha a placa da moto.',
        variant: 'destructive',
      });
      return false;
    }

    // Validate license plate format (AAA-1234 or AAA1B23)
    const plateUpper = license_plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const oldFormat = /^[A-Z]{3}\d{4}$/;
    const mercosulFormat = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    
    if (!oldFormat.test(plateUpper) && !mercosulFormat.test(plateUpper)) {
      toast({
        title: 'Placa inválida',
        description: 'Use o formato AAA-1234 ou AAA1B23 (Mercosul).',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let photoUrl = editingDriver?.photo_url || null;

      // Upload new photo if selected
      if (photoFile) {
        const driverId = editingDriver?.id || crypto.randomUUID();
        
        // Delete old photo if exists
        if (editingDriver?.photo_url) {
          try {
            await deleteDriverPhoto(editingDriver.photo_url);
          } catch (error) {
            console.error('Error deleting old photo:', error);
          }
        }

        photoUrl = await uploadDriverPhoto(photoFile, driverId);
      }

      const dataToSave = {
        ...formData,
        license_plate: formData.license_plate.toUpperCase(),
        ...(photoUrl && { photo_url: photoUrl }),
      };

      if (editingDriver) {
        updateDriver({ id: editingDriver.id, data: dataToSave });
      } else {
        addDriver(dataToSave);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving driver:', error);
    }
  };

  const handleDeleteClick = (driver: DeliveryDriver) => {
    setDriverToDelete(driver);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!driverToDelete) return;

    try {
      // Delete photo if exists
      if (driverToDelete.photo_url) {
        try {
          await deleteDriverPhoto(driverToDelete.photo_url);
        } catch (error) {
          console.error('Error deleting photo:', error);
        }
      }

      deleteDriver(driverToDelete.id);
      setDeleteDialogOpen(false);
      setDriverToDelete(null);
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  const handleToggleStatus = (driver: DeliveryDriver) => {
    toggleDriverStatus({ id: driver.id, isActive: !driver.is_active });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando motoboys...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Motoboys Cadastrados</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Motoboy
          </Button>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <div className="text-center py-8">
              <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum motoboy cadastrado ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Novo Motoboy" para adicionar.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Moto / Placa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={driver.photo_url || undefined} alt={driver.name} />
                          <AvatarFallback>
                            <Bike className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{driver.motorcycle_model}</div>
                          <div className="text-muted-foreground">{driver.license_plate}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={driver.is_active ? 'default' : 'secondary'}>
                          {driver.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(driver)}
                        >
                          {driver.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(driver)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(driver)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? 'Editar Motoboy' : 'Novo Motoboy'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={photoPreview || undefined} alt="Preview" />
                <AvatarFallback>
                  <ImageIcon className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Foto
                </Button>
                {photoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(editingDriver?.photo_url || null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG ou WEBP até 2MB
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Nome completo do motoboy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Phone */}
            <FormattedInput
              id="phone"
              label="Telefone"
              type="phone"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              required
            />

            {/* Motorcycle Model */}
            <div className="space-y-2">
              <Label htmlFor="motorcycle">Modelo da Moto *</Label>
              <Input
                id="motorcycle"
                placeholder="Ex: Honda CG 160"
                value={formData.motorcycle_model}
                onChange={(e) => setFormData({ ...formData, motorcycle_model: e.target.value })}
              />
            </div>

            {/* License Plate */}
            <div className="space-y-2">
              <Label htmlFor="plate">Placa *</Label>
              <Input
                id="plate"
                placeholder="ABC-1234 ou ABC1D23"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Formato: AAA-1234 ou AAA1B23 (Mercosul)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isAddingDriver || isUpdatingDriver}
            >
              {editingDriver ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o motoboy <strong>{driverToDelete?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDriverToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
