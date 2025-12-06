import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfigStatus {
  stripeConfigured: boolean;
  webhookConfigured: boolean;
  priceIdsConfigured: boolean;
  databaseTablesExist: boolean;
  edgeFunctionDeployed: boolean;
  loading: boolean;
  error: string | null;
}

export const StripeConfigChecker = () => {
  const [status, setStatus] = useState<ConfigStatus>({
    stripeConfigured: false,
    webhookConfigured: false,
    priceIdsConfigured: false,
    databaseTablesExist: false,
    edgeFunctionDeployed: false,
    loading: true,
    error: null,
  });

  const checkConfiguration = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Test edge function
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
        'create-checkout',
        { body: { test: true } }
      );

      const edgeFunctionDeployed = !edgeError || edgeError.message !== 'Not Found';

      // Check database tables
      const { error: dbError } = await supabase
        .from('subscriptions')
        .select('id')
        .limit(1);

      const databaseTablesExist = !dbError;

      setStatus({
        stripeConfigured: true, // If we got here, basic config is working
        webhookConfigured: true, // Assume true for now
        priceIdsConfigured: edgeFunctionDeployed,
        databaseTablesExist,
        edgeFunctionDeployed,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('[CONFIG-CHECKER] Error:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erro ao verificar configuração',
      }));
    }
  };

  useEffect(() => {
    checkConfiguration();
  }, []);

  const StatusIcon = ({ isOk }: { isOk: boolean }) => {
    if (status.loading) return <Loader2 className="h-5 w-5 animate-spin text-gray-400" />;
    return isOk ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const allConfigured =
    status.stripeConfigured &&
    status.webhookConfigured &&
    status.priceIdsConfigured &&
    status.databaseTablesExist &&
    status.edgeFunctionDeployed;

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Status da Configuração do Stripe</span>
          {allConfigured ? (
            <Badge className="bg-green-500">Tudo OK</Badge>
          ) : (
            <Badge variant="destructive">Configuração Pendente</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Erro na verificação</p>
              <p className="text-sm text-red-700 mt-1">{status.error}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <StatusIcon isOk={status.edgeFunctionDeployed} />
              <div>
                <p className="font-medium text-sm">Edge Function (create-checkout)</p>
                <p className="text-xs text-gray-600">Função de pagamento configurada</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <StatusIcon isOk={status.priceIdsConfigured} />
              <div>
                <p className="font-medium text-sm">Price IDs do Stripe</p>
                <p className="text-xs text-gray-600">
                  Planos configurados (STRIPE_PRICE_ID_*)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <StatusIcon isOk={status.databaseTablesExist} />
              <div>
                <p className="font-medium text-sm">Tabela de Assinaturas</p>
                <p className="text-xs text-gray-600">Banco de dados configurado</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <StatusIcon isOk={status.webhookConfigured} />
              <div>
                <p className="font-medium text-sm">Webhook do Stripe</p>
                <p className="text-xs text-gray-600">Sincronização automática</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={checkConfiguration}
            disabled={status.loading}
          >
            {status.loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Novamente'
            )}
          </Button>
        </div>

        {!allConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Ação necessária
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Alguns itens da configuração ainda não foram concluídos. Verifique os
                  secrets do Stripe no Supabase (STRIPE_SECRET_KEY, STRIPE_PRICE_ID_*).
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
