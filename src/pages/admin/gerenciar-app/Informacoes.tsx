import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useState, useEffect } from 'react';

export default function Informacoes() {
  const { storeInfo, isLoading, updateStoreInfo, isUpdating } = useStoreInfo();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    phone: '',
    email: '',
    address: '',
    instagram: '',
    facebook: '',
  });

  useEffect(() => {
    if (storeInfo) {
      setFormData({
        name: storeInfo.name || '',
        description: storeInfo.description || '',
        logo_url: storeInfo.logo_url || '',
        phone: storeInfo.phone || '',
        email: storeInfo.email || '',
        address: storeInfo.address || '',
        instagram: storeInfo.instagram || '',
        facebook: storeInfo.facebook || '',
      });
    }
  }, [storeInfo]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateStoreInfo(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Informações do App</h2>
        <p className="text-muted-foreground">
          Configure as informações básicas do seu aplicativo
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Nome da loja */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Loja *</Label>
          <Input
            id="name"
            placeholder="Minha Pizzaria"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Pizzaria tradicional com mais de 20 anos..."
            rows={3}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {formData.description.length}/500 caracteres
          </p>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label htmlFor="logo_url">URL do Logo</Label>
          <Input
            id="logo_url"
            type="url"
            placeholder="https://..."
            value={formData.logo_url}
            onChange={(e) => handleChange('logo_url', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Recomendado: 512x512px, formato PNG ou SVG
          </p>
        </div>

        {/* Contatos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 98765-4321"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contato@pizzaria.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-2">
          <Label htmlFor="address">Endereço Completo</Label>
          <Input
            id="address"
            placeholder="Rua das Flores, 123 - Centro"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </div>

        {/* Redes sociais */}
        <div className="space-y-4">
          <h3 className="font-semibold">Redes Sociais</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="@minhapizzaria"
                value={formData.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                placeholder="facebook.com/minhapizzaria"
                value={formData.facebook}
                onChange={(e) => handleChange('facebook', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Salvando...' : 'Salvar Informações'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
