import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  onRefresh?: () => void;
}

export const AdminLayout = ({ 
  children, 
  title, 
  description, 
  action,
  onRefresh 
}: AdminLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          {/* Header consistente */}
          <header className="border-b bg-card px-6 py-4 sticky top-0 z-10 backdrop-blur-sm bg-card/80">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {description && (
                  <p className="text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <Button onClick={onRefresh} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                )}
                {action}
              </div>
            </div>
          </header>
          
          {/* Conteúdo da página */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};