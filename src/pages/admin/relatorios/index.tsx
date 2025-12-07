import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BarChart3, FileText, Users, Truck, TrendingUp } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoaderOne from '@/components/ui/loader-one';

export default function Relatorios() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(true);

  // Auto-redirect to analytics if on base path
  useEffect(() => {
    if (location.pathname === '/admin/relatorios') {
      navigate('/admin/relatorios/analytics');
    }
  }, [location.pathname, navigate]);

  // Controlar o loader de 8 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

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
    <>
      {showLoader && (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="flex flex-col items-center gap-4">
            <LoaderOne />
            <p className="text-sm text-muted-foreground">Buscando análises...</p>
          </div>
        </div>
      )}
      
      <div className={showLoader ? 'hidden' : ''}>
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
      </div>
    </>
  );
}
