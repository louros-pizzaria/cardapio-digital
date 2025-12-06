import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FileText, Activity, CreditCard, Database } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function Sistema() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-redirect to logs if on base path
  useEffect(() => {
    if (location.pathname === '/admin/sistema') {
      navigate('/admin/sistema/logs');
    }
  }, [location.pathname, navigate]);

  const tabs = [
    { value: 'logs', label: 'Logs', icon: FileText, path: '/admin/sistema/logs' },
    { value: 'status', label: 'Status do Sistema', icon: Activity, path: '/admin/sistema/status' },
    { value: 'planos', label: 'Planos', icon: CreditCard, path: '/admin/sistema/planos' },
    { value: 'backups', label: 'Backups', icon: Database, path: '/admin/sistema/backups' },
  ];

  const getCurrentTab = () => {
    const currentPath = location.pathname;
    const tab = tabs.find(t => currentPath.startsWith(t.path));
    return tab?.value || 'logs';
  };

  const handleTabChange = (value: string) => {
    const tab = tabs.find(t => t.value === value);
    if (tab) navigate(tab.path);
  };

  return (
    <AdminLayout 
      title="Sistema" 
      description="Monitoramento e gerenciamento do sistema"
    >
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
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
