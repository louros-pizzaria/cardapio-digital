import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Target, MessageSquare, Award } from 'lucide-react';
import Clientes from './Clientes';
import Segmentacao from './Segmentacao';
import Comunicacao from './Comunicacao';
import Fidelidade from './Fidelidade';

export default function CRM() {
  return (
    <AdminLayout 
      title="CRM" 
      description="Gestão de relacionamento com clientes"
    >
      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clientes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="segmentacao" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Segmentação</span>
          </TabsTrigger>
          <TabsTrigger value="comunicacao" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Comunicação</span>
          </TabsTrigger>
          <TabsTrigger value="fidelidade" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Fidelidade</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes">
          <Clientes />
        </TabsContent>

        <TabsContent value="segmentacao">
          <Segmentacao />
        </TabsContent>

        <TabsContent value="comunicacao">
          <Comunicacao />
        </TabsContent>

        <TabsContent value="fidelidade">
          <Fidelidade />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
