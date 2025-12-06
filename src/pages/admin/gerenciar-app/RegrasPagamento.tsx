import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PagamentoOnline from './regras-pagamento/PagamentoOnline';
import PagamentoPresencial from './regras-pagamento/PagamentoPresencial';
import ConfiguracoesPagamentos from './regras-pagamento/ConfiguracoesPagamentos';

export default function RegrasPagamento() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Regras e Pagamentos</h2>
        <p className="text-muted-foreground">
          Configure formas de pagamento e regras de pedidos
        </p>
      </div>

      <Tabs defaultValue="online" className="w-full">
        <TabsList>
          <TabsTrigger value="online">Pagamento Online</TabsTrigger>
          <TabsTrigger value="presencial">Pagamento Presencial</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações de Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="online" className="mt-6">
          <PagamentoOnline />
        </TabsContent>

        <TabsContent value="presencial" className="mt-6">
          <PagamentoPresencial />
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-6">
          <ConfiguracoesPagamentos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
