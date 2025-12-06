import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Rocket } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const plans = [
  {
    name: 'Básico',
    icon: Zap,
    price: 'R$ 49',
    period: '/mês',
    description: 'Perfeito para começar',
    current: false,
    features: [
      'Até 100 pedidos/mês',
      '1 usuário admin',
      'Suporte por email',
      'Integrações básicas',
      'Dashboard básico',
    ],
  },
  {
    name: 'Profissional',
    icon: Crown,
    price: 'R$ 149',
    period: '/mês',
    description: 'Ideal para negócios em crescimento',
    current: true,
    popular: true,
    features: [
      'Até 1.000 pedidos/mês',
      '5 usuários',
      'Suporte prioritário',
      'Todas as integrações',
      'Dashboard avançado',
      'Relatórios personalizados',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    icon: Rocket,
    price: 'R$ 499',
    period: '/mês',
    description: 'Para grandes operações',
    current: false,
    features: [
      'Pedidos ilimitados',
      'Usuários ilimitados',
      'Suporte 24/7',
      'Integrações customizadas',
      'Dashboard personalizado',
      'Treinamento dedicado',
      'SLA garantido',
      'Backup dedicado',
    ],
  },
];

const usageStats = [
  { label: 'Pedidos este mês', value: '687', limit: '1.000', percentage: 68.7 },
  { label: 'Usuários ativos', value: '3', limit: '5', percentage: 60 },
  { label: 'Armazenamento', value: '12.4 GB', limit: '50 GB', percentage: 24.8 },
  { label: 'API Calls', value: '45.2k', limit: '100k', percentage: 45.2 },
];

export default function Planos() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Planos e Assinatura</h2>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e veja o uso de recursos
        </p>
      </div>

      {/* Plano Atual */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Plano Atual</h3>
            <p className="text-muted-foreground text-sm">
              Sua assinatura está ativa até 23/11/2025
            </p>
          </div>
          <Badge className="bg-primary">
            <Crown className="h-3 w-3 mr-1" />
            Profissional
          </Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {usageStats.map((stat, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="font-medium">{stat.value} / {stat.limit}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Planos Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          return (
            <Card 
              key={index} 
              className={`p-6 relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                  Mais Popular
                </Badge>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 ${plan.popular ? 'bg-primary' : 'bg-secondary'} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${plan.popular ? 'text-primary-foreground' : ''}`} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {plan.current ? (
                <Button className="w-full" disabled>
                  Plano Atual
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  Fazer Upgrade
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
