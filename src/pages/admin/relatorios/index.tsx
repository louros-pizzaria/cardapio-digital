import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BarChart3, FileText, Users, Truck, TrendingUp } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function Relatorios() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect to analytics if on base path
  useEffect(() => {
    if (location.pathname === '/admin/relatorios') {
      navigate('/admin/relatorios/analytics');
    }
  }, [location.pathname, navigate]);

  const tabs = [
    { value: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/relatorios/analytics' },
    { value: 'pedidos', label: 'Pedidos', icon: FileText, path: '/admin/relatorios/pedidos' },
    { value: 'vendas', label: 'Vendas por Categoria', icon: TrendingUp, path: '/admin/relatorios/vendas' },
    { value: 'clientes', label: 'Clientes', icon: Users, path: '/admin/relatorios/clientes' },
    { value: 'delivery', label: 'Performance Delivery', icon: Truck, path: '/admin/relatorios/delivery' },
  ];

  const getCurrentTab = () => {
    const currentPath = location.pathname;
    const tab = tabs.find(t => currentPath.startsWith(t.path));
    return tab?.value || 'analytics';
  };

  const handleTabChange = (value: string) => {
    const tab = tabs.find(t => t.value === value);
    if (tab) navigate(tab.path);
  };

  return (
    <AdminLayout 
      title="Relatórios" 
      description="Análises e insights do seu negócio"
    >
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
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
