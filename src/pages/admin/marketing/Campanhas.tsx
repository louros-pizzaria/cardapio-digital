import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Send, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useMarketingData } from '@/hooks/useMarketingData';

export default function Campanhas() {
  const { campaigns, loadingCampaigns } = useMarketingData();

  const getTotalRevenue = () => {
    return campaigns?.reduce((acc, c) => acc + (c.sent_count || 0), 0) || 0;
  };

  const getSentCampaigns = () => {
    return campaigns?.filter(c => c.status === 'sent').length || 0;
  };

  const getTotalSent = () => {
    return campaigns?.reduce((acc, c) => acc + (c.sent_count || 0), 0) || 0;
  };

  const getAvgConversion = () => {
    const sent = campaigns?.filter(c => c.status === 'sent') || [];
    if (sent.length === 0) return 0;
    const totalSent = sent.reduce((acc, c) => acc + (c.sent_count || 0), 0);
    const totalOpened = sent.reduce((acc, c) => acc + (c.open_count || 0), 0);
    return totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
  };

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
              <p className="text-2xl font-bold">{getSentCampaigns()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Alcançado</p>
              <p className="text-2xl font-bold">{getTotalSent()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Abertura</p>
              <p className="text-2xl font-bold">{getAvgConversion()}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Campanhas</p>
              <p className="text-2xl font-bold">{campaigns?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Campanhas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Campanhas de Marketing</h3>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {loadingCampaigns ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : campaigns && campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma campanha cadastrada
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{campaign.name}</h4>
                    <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                      {campaign.status === 'sent' ? 'Enviada' : campaign.status === 'scheduled' ? 'Agendada' : 'Rascunho'}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {campaign.campaign_type === 'email' ? (
                        <><Mail className="h-3 w-3" /> Email</>
                      ) : campaign.campaign_type === 'sms' ? (
                        <><MessageSquare className="h-3 w-3" /> SMS</>
                      ) : (
                        <><MessageSquare className="h-3 w-3" /> WhatsApp</>
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {campaign.sent_at 
                      ? `Enviada em ${new Date(campaign.sent_at).toLocaleDateString()}` 
                      : campaign.scheduled_at
                      ? `Agendada para ${new Date(campaign.scheduled_at).toLocaleDateString()}`
                      : `Criada em ${new Date(campaign.created_at).toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>

              {campaign.status === 'sent' && (
                <div className="grid grid-cols-4 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Enviados</p>
                    <p className="text-xl font-bold">{campaign.sent_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Abertos</p>
                    <p className="text-xl font-bold text-blue-500">
                      {campaign.open_count || 0}
                      {campaign.sent_count > 0 && (
                        <span className="text-sm ml-1">
                          ({(((campaign.open_count || 0) / campaign.sent_count) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Cliques</p>
                    <p className="text-xl font-bold text-purple-500">
                      {campaign.click_count || 0}
                      {campaign.sent_count > 0 && (
                        <span className="text-sm ml-1">
                          ({(((campaign.click_count || 0) / campaign.sent_count) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Destinatários</p>
                    <p className="text-xl font-bold text-green-500">
                      {campaign.total_recipients || 0}
                    </p>
                  </div>
                </div>
              )}
            </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
