import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDeliveryZones } from '@/components/AdminDeliveryZones';
import { AdminDeliveryDrivers } from '@/components/AdminDeliveryDrivers';
import { MapPin, Bike } from 'lucide-react';

export default function Delivery() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestão de Delivery</h2>
        <p className="text-muted-foreground">
          Configure zonas de entrega, taxas e motoboys
        </p>
      </div>

      <Tabs defaultValue="zones" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Áreas de Entrega
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Motoboys
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="zones">
          <AdminDeliveryZones />
        </TabsContent>
        
        <TabsContent value="drivers">
          <AdminDeliveryDrivers />
        </TabsContent>
      </Tabs>
    </div>
  );
}
