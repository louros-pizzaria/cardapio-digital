import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Printer, Users, User } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function Configuracoes() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect to impressao if on base path
  useEffect(() => {
    if (location.pathname === '/admin/configuracoes') {
      navigate('/admin/configuracoes/impressao');
    }
  }, [location.pathname, navigate]);

  const tabs = [
    { value: 'impressao', label: 'Impressão', icon: Printer, path: '/admin/configuracoes/impressao' },
    { value: 'usuarios', label: 'Usuários', icon: Users, path: '/admin/configuracoes/usuarios' },
    { value: 'conta', label: 'Conta', icon: User, path: '/admin/configuracoes/conta' },
  ];

  const getCurrentTab = () => {
    const currentPath = location.pathname;
    const tab = tabs.find(t => currentPath.startsWith(t.path));
    return tab?.value || 'impressao';
  };

  const handleTabChange = (value: string) => {
    const tab = tabs.find(t => t.value === value);
    if (tab) navigate(tab.path);
  };

  return (
    <AdminLayout 
      title="Configurações" 
      description="Configure as preferências do sistema"
    >
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
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
