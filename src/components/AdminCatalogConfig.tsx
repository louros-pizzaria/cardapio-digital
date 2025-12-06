import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AdminProductCrusts } from './AdminProductCrusts';
import { AdminDeliveryZones } from './AdminDeliveryZones';

export const AdminCatalogConfig = () => {
  return (
    <Tabs defaultValue="crusts" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="crusts">Bordas Recheadas</TabsTrigger>
        <TabsTrigger value="delivery">Taxas de Entrega</TabsTrigger>
      </TabsList>

      <TabsContent value="crusts" className="mt-6">
        <AdminProductCrusts />
      </TabsContent>

      <TabsContent value="delivery" className="mt-6">
        <AdminDeliveryZones />
      </TabsContent>
    </Tabs>
  );
};
