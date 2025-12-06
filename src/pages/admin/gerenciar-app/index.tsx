import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Package, Truck, CreditCard, Clock, Info, Gift, Bell } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function GerenciarApp() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect to produtos if on base path
  useEffect(() => {
    if (location.pathname === '/admin/gerenciar-app') {
      navigate('/admin/gerenciar-app/produtos');
    }
  }, [location.pathname, navigate]);

  const tabs = [
    { value: 'produtos', label: 'Produtos', icon: Package, path: '/admin/gerenciar-app/produtos' },
    { value: 'delivery', label: 'Delivery', icon: Truck, path: '/admin/gerenciar-app/delivery' },
    { value: 'regras-pagamento', label: 'Regras e Pagamentos', icon: CreditCard, path: '/admin/gerenciar-app/regras-pagamento' },
    { value: 'horarios', label: 'Horário de Funcionamento', icon: Clock, path: '/admin/gerenciar-app/horarios' },
    { value: 'notificacoes', label: 'Notificações', icon: Bell, path: '/admin/gerenciar-app/notificacoes' },
    { value: 'informacoes', label: 'Informações do App', icon: Info, path: '/admin/gerenciar-app/informacoes' },
    { value: 'fidelidade', label: 'Fidelidade', icon: Gift, path: '/admin/gerenciar-app/fidelidade' },
  ];

  const getCurrentTab = () => {
    const currentPath = location.pathname;
    const tab = tabs.find(t => currentPath.startsWith(t.path));
    return tab?.value || 'produtos';
  };

  const handleTabChange = (value: string) => {
    const tab = tabs.find(t => t.value === value);
    if (tab) navigate(tab.path);
  };

  return (
    <AdminLayout 
      title="Gerenciar App" 
      description="Configure todos os aspectos do seu aplicativo"
    >
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <Outlet />
        </div>
      </Tabs>
    </AdminLayout>
  );
}
