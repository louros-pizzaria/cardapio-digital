import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Building2, Webhook } from 'lucide-react';
import Delivery from './Delivery';
import ERP from './ERP';
import Webhooks from './Webhooks';

export default function Integracoes() {
  return (
    <AdminLayout 
      title="Integrações" 
      description="Conecte seu sistema com ferramentas externas"
    >
      <Tabs defaultValue="delivery" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="erp" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">ERP</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivery">
          <Delivery />
        </TabsContent>

        <TabsContent value="erp">
          <ERP />
        </TabsContent>

        <TabsContent value="webhooks">
          <Webhooks />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
