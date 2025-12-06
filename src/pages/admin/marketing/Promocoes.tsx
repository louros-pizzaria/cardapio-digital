import { useMarketingData } from '@/hooks/useMarketingData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Percent } from 'lucide-react';

export default function Promocoes() {
  const { promotions, loadingPromotions, promotionStats } = useMarketingData();

  if (loadingPromotions) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotionStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotionStats.active}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Promoções</CardTitle>
            <Button><Plus className="mr-2 h-4 w-4" />Nova</Button>
          </div>
        </CardHeader>
        <CardContent>
          {promotions && promotions.length > 0 ? (
            <div className="space-y-4">
              {promotions.map((promo) => (
                <div key={promo.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{promo.name}</span>
                    <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                      {promo.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{promo.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma promoção cadastrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
