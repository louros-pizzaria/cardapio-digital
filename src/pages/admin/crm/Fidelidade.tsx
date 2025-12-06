import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, Gift, Star, TrendingUp, Users, Crown } from 'lucide-react';

const loyaltyStats = [
  { label: 'Membros Ativos', value: '342', icon: Users, color: 'text-blue-500' },
  { label: 'Pontos Resgatados', value: '12.5k', icon: Gift, color: 'text-green-500' },
  { label: 'Taxa de Retenção', value: '87%', icon: TrendingUp, color: 'text-purple-500' },
  { label: 'Membros VIP', value: '67', icon: Crown, color: 'text-yellow-500' },
];

const tiers = [
  {
    name: 'Bronze',
    minOrders: 0,
    benefits: ['2% de cashback', 'Frete grátis acima de R$ 50'],
    members: 189,
    color: 'text-orange-600',
  },
  {
    name: 'Prata',
    minOrders: 5,
    benefits: ['5% de cashback', 'Frete grátis acima de R$ 30', 'Aniversário especial'],
    members: 156,
    color: 'text-gray-400',
  },
  {
    name: 'Ouro',
    minOrders: 15,
    benefits: ['10% de cashback', 'Frete sempre grátis', 'Prioridade no atendimento', 'Brindes exclusivos'],
    members: 67,
    color: 'text-yellow-500',
  },
];

const rewards = [
  { name: 'Pizza Grátis', points: 500, redeemed: 45, available: true },
  { name: 'Refrigerante 2L', points: 100, redeemed: 123, available: true },
  { name: 'Desconto 20%', points: 300, redeemed: 67, available: true },
  { name: 'Sobremesa Grátis', points: 150, redeemed: 89, available: true },
];

const recentActivities = [
  { customer: 'João Silva', action: 'Resgatou Pizza Grátis', points: -500, date: '2 horas atrás' },
  { customer: 'Maria Santos', action: 'Ganhou pontos', points: 42, date: '5 horas atrás' },
  { customer: 'Pedro Costa', action: 'Resgatou Desconto 20%', points: -300, date: '1 dia atrás' },
  { customer: 'Ana Oliveira', action: 'Subiu para tier Ouro', points: 0, date: '2 dias atrás' },
];

export default function Fidelidade() {
  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loyaltyStats.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-secondary rounded-lg">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tiers de Fidelidade */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Níveis de Fidelidade</h3>
          <Button variant="outline" size="sm">
            <Award className="h-4 w-4 mr-2" />
            Configurar Tiers
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier, index) => (
            <Card key={index} className="p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-3">
                  <Crown className={`h-8 w-8 ${tier.color}`} />
                </div>
                <h4 className={`text-xl font-bold ${tier.color} mb-1`}>{tier.name}</h4>
                <p className="text-sm text-muted-foreground">
                  A partir de {tier.minOrders} pedidos
                </p>
              </div>

              <div className="space-y-2 mb-4">
                {tier.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Membros</span>
                  <span className="font-bold">{tier.members}</span>
                </div>
                <Progress 
                  value={(tier.members / 412) * 100} 
                  className="h-2"
                />
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recompensas */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Catálogo de Recompensas</h3>
            <Button variant="outline" size="sm">
              <Gift className="h-4 w-4 mr-2" />
              Nova Recompensa
            </Button>
          </div>

          <div className="space-y-3">
            {rewards.map((reward, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium">{reward.name}</p>
                    <Badge variant={reward.available ? 'default' : 'secondary'}>
                      {reward.available ? 'Disponível' : 'Esgotado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Resgatado {reward.redeemed}x este mês
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold">{reward.points}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Atividades Recentes */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
          
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="p-2 bg-secondary rounded-full shrink-0">
                  {activity.points > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : activity.points < 0 ? (
                    <Gift className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Award className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.customer}</p>
                  <p className="text-sm text-muted-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                </div>
                {activity.points !== 0 && (
                  <div className={`font-bold ${activity.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {activity.points > 0 ? '+' : ''}{activity.points}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
