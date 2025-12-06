import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { User, MapPin, Plus, Edit, Trash2, Settings } from 'lucide-react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useAddresses } from '@/hooks/useAddresses';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';

const Account = () => {
  const { user } = useUnifiedAuth();
  const { addresses, loading: addressLoading, addAddress, updateAddress, deleteAddress } = useAddresses();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });
  
  const [addressForm, setAddressForm] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: 'Sua Cidade',
    state: 'SP',
    zip_code: '',
    complement: '',
    reference_point: '',
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
        setProfileForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          email: user?.email,
          ...profileForm,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setIsEditingProfile(false);
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, addressForm);
        setEditingAddress(null);
      } else {
        await addAddress(addressForm);
        setIsAddingAddress(false);
      }
      
      // Reset form
      setAddressForm({
        street: '',
        number: '',
        neighborhood: '',
        city: 'Sua Cidade',
        state: 'SP',
        zip_code: '',
        complement: '',
        reference_point: '',
        is_default: false,
      });
      
    } catch (error) {
      // Error is handled in useAddresses hook
    }
  };

  const handleEditAddress = (address: any) => {
    setAddressForm({
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      complement: address.complement || '',
      reference_point: address.reference_point || '',
      is_default: address.is_default,
    });
    setEditingAddress(address);
  };

  const handleDeleteAddress = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este endereço?')) {
      await deleteAddress(id);
    }
  };

  const formatAddress = (address: any) => {
    return `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}`;
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pizza-red mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto">
              <h1 className="text-xl font-semibold">Minha Conta</h1>
            </div>
          </header>
          <div className="flex-1 bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Minha Conta</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e endereços
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      O e-mail não pode ser alterado
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="gradient-pizza">
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingProfile(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>E-mail</Label>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  
                  <div>
                    <Label>Nome Completo</Label>
                    <p className="font-medium">
                      {profile?.full_name || 'Não informado'}
                    </p>
                  </div>
                  
                  <div>
                    <Label>Telefone</Label>
                    <p className="font-medium">
                      {profile?.phone || 'Não informado'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Informações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addresses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereços
                </div>
                <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Endereço</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="street">Rua</Label>
                          <Input
                            id="street"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="number">Número</Label>
                          <Input
                            id="number"
                            value={addressForm.number}
                            onChange={(e) => setAddressForm({...addressForm, number: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={addressForm.neighborhood}
                          onChange={(e) => setAddressForm({...addressForm, neighborhood: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="city">Cidade</Label>
                          <Input
                            id="city"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">Estado</Label>
                          <Input
                            id="state"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="zip_code">CEP</Label>
                          <Input
                            id="zip_code"
                            value={addressForm.zip_code}
                            onChange={(e) => setAddressForm({...addressForm, zip_code: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          value={addressForm.complement}
                          onChange={(e) => setAddressForm({...addressForm, complement: e.target.value})}
                          placeholder="Apto, casa, etc."
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="reference_point">Ponto de Referência</Label>
                        <Textarea
                          id="reference_point"
                          value={addressForm.reference_point}
                          onChange={(e) => setAddressForm({...addressForm, reference_point: e.target.value})}
                          placeholder="Próximo ao mercado, etc."
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_default"
                          checked={addressForm.is_default}
                          onCheckedChange={(checked) => setAddressForm({...addressForm, is_default: checked as boolean})}
                        />
                        <Label htmlFor="is_default">Definir como endereço padrão</Label>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button type="submit" className="gradient-pizza">
                          Salvar Endereço
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddingAddress(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {addressLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pizza-red mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando endereços...</p>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Você ainda não tem endereços cadastrados
                  </p>
                  <Button
                    onClick={() => setIsAddingAddress(true)}
                    className="gradient-pizza"
                  >
                    Adicionar Primeiro Endereço
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div key={address.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{formatAddress(address)}</p>
                          {address.complement && (
                            <p className="text-sm text-muted-foreground">{address.complement}</p>
                          )}
                          {address.reference_point && (
                            <p className="text-sm text-muted-foreground">Ref: {address.reference_point}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {address.is_default && (
                            <Badge variant="default" className="text-xs">
                              Padrão
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditAddress(address)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAddress(address.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit Address Dialog */}
              <Dialog open={!!editingAddress} onOpenChange={() => setEditingAddress(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Endereço</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="street">Rua</Label>
                        <Input
                          id="street"
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          value={addressForm.number}
                          onChange={(e) => setAddressForm({...addressForm, number: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={addressForm.neighborhood}
                        onChange={(e) => setAddressForm({...addressForm, neighborhood: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="zip_code">CEP</Label>
                        <Input
                          id="zip_code"
                          value={addressForm.zip_code}
                          onChange={(e) => setAddressForm({...addressForm, zip_code: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={addressForm.complement}
                        onChange={(e) => setAddressForm({...addressForm, complement: e.target.value})}
                        placeholder="Apto, casa, etc."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="reference_point">Ponto de Referência</Label>
                      <Textarea
                        id="reference_point"
                        value={addressForm.reference_point}
                        onChange={(e) => setAddressForm({...addressForm, reference_point: e.target.value})}
                        placeholder="Próximo ao mercado, etc."
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_default"
                        checked={addressForm.is_default}
                        onCheckedChange={(checked) => setAddressForm({...addressForm, is_default: checked as boolean})}
                      />
                      <Label htmlFor="is_default">Definir como endereço padrão</Label>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button type="submit" className="gradient-pizza">
                        Salvar Endereço
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingAddress(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Account;
