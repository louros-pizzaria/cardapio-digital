import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { applyStrategy } from '@/config/queryCacheMapping';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  motorcycle_model: string;
  license_plate: string;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DriverFormData {
  name: string;
  phone: string;
  motorcycle_model: string;
  license_plate: string;
  is_active?: boolean;
}

export const useDeliveryDrivers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all drivers
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: async () => {
      console.debug('DeliveryDrivers: Buscando motoboys');
      const { data, error } = await supabase
        .from('delivery_drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeliveryDriver[];
    },
    ...applyStrategy('deliveryDrivers'),
  });

  // Add driver
  const addDriver = useMutation({
    mutationFn: async (data: DriverFormData) => {
      console.debug('DeliveryDrivers: Criando motoboy', data);
      const { data: newDriver, error } = await supabase
        .from('delivery_drivers')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newDriver;
    },
    onSuccess: (newDriver) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({
        title: 'Motoboy cadastrado!',
        description: `${newDriver.name} foi adicionado com sucesso.`,
      });
      console.debug('DeliveryDrivers: Motoboy criado com sucesso', newDriver);
    },
    onError: (error: any) => {
      console.error('DeliveryDrivers: Erro ao criar motoboy', error);
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Não foi possível cadastrar o motoboy.',
        variant: 'destructive',
      });
    },
  });

  // Update driver
  const updateDriver = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DriverFormData> }) => {
      console.debug('DeliveryDrivers: Atualizando motoboy', { id, data });
      const { data: updatedDriver, error } = await supabase
        .from('delivery_drivers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedDriver;
    },
    onSuccess: (updatedDriver) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({
        title: 'Motoboy atualizado!',
        description: `${updatedDriver.name} foi atualizado com sucesso.`,
      });
      console.debug('DeliveryDrivers: Motoboy atualizado com sucesso', updatedDriver);
    },
    onError: (error: any) => {
      console.error('DeliveryDrivers: Erro ao atualizar motoboy', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o motoboy.',
        variant: 'destructive',
      });
    },
  });

  // Delete driver
  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      console.debug('DeliveryDrivers: Excluindo motoboy', { id });
      const { error } = await supabase
        .from('delivery_drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({
        title: 'Motoboy removido!',
        description: 'O motoboy foi excluído com sucesso.',
      });
      console.debug('DeliveryDrivers: Motoboy excluído com sucesso');
    },
    onError: (error: any) => {
      console.error('DeliveryDrivers: Erro ao excluir motoboy', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o motoboy.',
        variant: 'destructive',
      });
    },
  });

  // Toggle driver active status
  const toggleDriverStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      console.debug('DeliveryDrivers: Alternando status', { id, isActive });
      const { error } = await supabase
        .from('delivery_drivers')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });
      toast({
        title: 'Status atualizado!',
        description: 'O status do motoboy foi alterado.',
      });
    },
    onError: (error: any) => {
      console.error('DeliveryDrivers: Erro ao alterar status', error);
      toast({
        title: 'Erro ao alterar status',
        description: error.message || 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    },
  });

  // Upload driver photo
  const uploadDriverPhoto = async (file: File, driverId: string): Promise<string> => {
    console.debug('DeliveryDrivers: Fazendo upload de foto', { driverId, fileName: file.name });
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${driverId}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('delivery-drivers')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('DeliveryDrivers: Erro ao fazer upload', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('delivery-drivers')
      .getPublicUrl(filePath);

    console.debug('DeliveryDrivers: Foto enviada com sucesso', { publicUrl });
    return publicUrl;
  };

  // Delete driver photo
  const deleteDriverPhoto = async (photoUrl: string): Promise<void> => {
    console.debug('DeliveryDrivers: Removendo foto', { photoUrl });
    
    const fileName = photoUrl.split('/').pop();
    if (!fileName) return;

    const { error } = await supabase.storage
      .from('delivery-drivers')
      .remove([fileName]);

    if (error) {
      console.error('DeliveryDrivers: Erro ao remover foto', error);
      throw error;
    }

    console.debug('DeliveryDrivers: Foto removida com sucesso');
  };

  return {
    drivers,
    isLoading,
    addDriver: addDriver.mutate,
    updateDriver: updateDriver.mutate,
    deleteDriver: deleteDriver.mutate,
    toggleDriverStatus: toggleDriverStatus.mutate,
    uploadDriverPhoto,
    deleteDriverPhoto,
    isAddingDriver: addDriver.isPending,
    isUpdatingDriver: updateDriver.isPending,
    isDeletingDriver: deleteDriver.isPending,
  };
};
