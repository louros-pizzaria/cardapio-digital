import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Image, Plus, Edit, Trash2, Eye, TrendingUp } from 'lucide-react';
import { useMarketingData } from '@/hooks/useMarketingData';

export default function Banners() {
  const { banners, loadingBanners, createBanner, updateBanner, deleteBanner } = useMarketingData();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    position: 'home',
    image_url: '',
    link_url: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  const handleSaveBanner = () => {
    if (!formData.title) {
      return;
    }

    if (isEditing && selectedBanner) {
      updateBanner({
        id: selectedBanner.id,
        ...formData
      });
    } else {
      createBanner(formData);
    }

    setIsCreating(false);
    setIsEditing(false);
    setSelectedBanner(null);
    setFormData({
      title: '',
      position: 'home',
      image_url: '',
      link_url: '',
      valid_from: '',
      valid_until: '',
      is_active: true
    });
  };

  const handleEditBanner = (banner: any) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title,
      position: banner.position,
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      valid_from: banner.valid_from ? banner.valid_from.split('T')[0] : '',
      valid_until: banner.valid_until ? banner.valid_until.split('T')[0] : '',
      is_active: banner.is_active
    });
    setIsEditing(true);
    setIsCreating(true);
  };

  const handleDeleteBanner = (id: string) => {
    if (confirm('Deseja realmente excluir este banner?')) {
      deleteBanner(id);
    }
  };

  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'home_hero': return 'Página Inicial (Hero)';
      case 'menu_top': return 'Topo do Cardápio';
      case 'checkout': return 'Checkout';
      case 'menu_sidebar': return 'Sidebar do Cardápio';
      default: return position;
    }
  };

  const getTotalClicks = () => {
    return banners?.reduce((acc, banner) => acc + (banner.click_count || 0), 0) || 0;
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Image className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Banners Ativos</p>
              <p className="text-2xl font-bold">{banners?.filter(b => b.is_active).length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Eye className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Banners</p>
              <p className="text-2xl font-bold">{banners?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliques Totais</p>
              <p className="text-2xl font-bold">{banners?.reduce((sum, b) => sum + (b.click_count || 0), 0) || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inativos</p>
              <p className="text-2xl font-bold">{banners?.filter(b => !b.is_active).length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Criar Banner */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Banners Promocionais</h3>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Banner</DialogTitle>
                <DialogDescription>
                  Configure um novo banner promocional
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título do Banner *</Label>
                  <Input 
                    placeholder="Ex: Black Friday - 50% OFF"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Posição do Banner</Label>
                  <Select 
                    value={formData.position}
                    onValueChange={(value) => setFormData({ ...formData, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Página Inicial (Hero)</SelectItem>
                      <SelectItem value="menu">Topo do Cardápio</SelectItem>
                      <SelectItem value="checkout">Checkout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>URL da Imagem</Label>
                  <Input 
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tamanho recomendado: 1200x400px
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Link de Destino (opcional)</Label>
                  <Input 
                    placeholder="/menu?promo=blackfriday"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input 
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input 
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    id="banner-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="banner-active">Banner Ativo</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={handleSaveBanner}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isEditing ? 'Atualizar' : 'Criar'} Banner
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    setSelectedBanner(null);
                  }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Banners */}
        {loadingBanners ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : banners && banners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum banner cadastrado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners?.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              {/* Preview da Imagem */}
              <div className="aspect-[3/1] bg-muted flex items-center justify-center">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
              
              {/* Informações */}
              <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{banner.title}</h4>
                <Badge variant={banner.is_active ? 'default' : 'secondary'}>
                  {banner.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {getPositionLabel(banner.position)}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Posição</p>
                    <p className="font-bold">{getPositionLabel(banner.position || 'home')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cliques</p>
                    <p className="font-bold">{banner.click_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Válido De</p>
                    <p className="font-bold text-xs">
                      {banner.valid_from ? new Date(banner.valid_from).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Válido Até</p>
                    <p className="font-bold text-xs">
                      {banner.valid_until ? new Date(banner.valid_until).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditBanner(banner)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteBanner(banner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
