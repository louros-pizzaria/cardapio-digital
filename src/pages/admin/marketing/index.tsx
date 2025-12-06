import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, Percent, Mail, Image } from 'lucide-react';
import Cupons from './Cupons';
import Promocoes from './Promocoes';
import Campanhas from './Campanhas';
import Banners from './Banners';

export default function Marketing() {
  return (
    <AdminLayout 
      title="Marketing" 
      description="Gerencie campanhas, cupons e promoções"
    >
      <Tabs defaultValue="cupons" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cupons" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Cupons</span>
          </TabsTrigger>
          <TabsTrigger value="promocoes" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Promoções</span>
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
          <TabsTrigger value="banners" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Banners</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cupons">
          <Cupons />
        </TabsContent>

        <TabsContent value="promocoes">
          <Promocoes />
        </TabsContent>

        <TabsContent value="campanhas">
          <Campanhas />
        </TabsContent>

        <TabsContent value="banners">
          <Banners />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
