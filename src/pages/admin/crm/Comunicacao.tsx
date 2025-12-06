import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Mail, MessageSquare, Send, Calendar, Users, TrendingUp } from 'lucide-react';
import { useCommunicationData } from '@/hooks/useCommunicationData';
import { useCRMData } from '@/hooks/useCRMData';
import { Skeleton } from '@/components/ui/skeleton';

export default function Comunicacao() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    campaign_type: 'email',
    segment_id: '',
    subject: '',
    message: '',
    scheduled_at: '',
  });

  const { campaigns, loadingCampaigns, createCampaign, stats } = useCommunicationData();
  const { segments } = useCRMData();

  const handleSubmit = () => {
    createCampaign({
      ...formData,
      status: formData.scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: formData.scheduled_at || null,
    });
    setIsCreating(false);
    setFormData({
      name: '',
      campaign_type: 'email',
      segment_id: '',
      subject: '',
      message: '',
      scheduled_at: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default">Enviada</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Agendada</Badge>;
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'email':
        return (
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3 w-3" />
            Email
          </Badge>
        );
      case 'sms':
        return (
          <Badge variant="outline" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            SMS
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loadingCampaigns) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Send className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Campanhas Enviadas</p>
              <p className="text-2xl font-bold">{stats.sentCampaigns}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Mail className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Abertura</p>
              <p className="text-2xl font-bold">{stats.openRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Cliques</p>
              <p className="text-2xl font-bold">{stats.clickRate}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Users className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alcance Total</p>
              <p className="text-2xl font-bold">{stats.totalSent}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Criar Nova Campanha */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Campanhas de Comunicação</h3>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Configure uma nova campanha de comunicação com seus clientes
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Campanha</Label>
                    <Input 
                      placeholder="Ex: Promoção de Verão"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={formData.campaign_type}
                      onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Select 
                    value={formData.segment_id}
                    onValueChange={(value) => setFormData({ ...formData, segment_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments?.map(segment => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input 
                    placeholder="Digite o assunto do email"
                    value={formData.subject || ''}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea 
                    placeholder="Digite sua mensagem aqui..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Agendar Envio (opcional)</Label>
                  <Input 
                    type="datetime-local"
                    value={formData.scheduled_at || ''}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={!formData.name || !formData.message}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Salvar Campanha
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Campanhas */}
        <div className="space-y-3">
          {campaigns && campaigns.length > 0 ? campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{campaign.name}</h4>
                    {getTypeBadge(campaign.campaign_type)}
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {campaign.customer_segments?.name} • {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {campaign.status === 'sent' && campaign.sent_count > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Enviados</p>
                    <p className="text-xl font-bold">{campaign.sent_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Abertos</p>
                    <p className="text-xl font-bold text-blue-500">
                      {campaign.open_count}
                      <span className="text-sm ml-1">
                        ({((campaign.open_count / campaign.sent_count) * 100).toFixed(0)}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Cliques</p>
                    <p className="text-xl font-bold text-purple-500">
                      {campaign.click_count}
                      <span className="text-sm ml-1">
                        ({((campaign.click_count / campaign.sent_count) * 100).toFixed(0)}%)
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma campanha criada ainda</p>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}
