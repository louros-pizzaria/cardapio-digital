import { 
  Home, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut,
  ChefHat,
  Truck,
  Users
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useAttendant } from "@/providers/AttendantProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { 
    title: "Gestão de Pedidos", 
    url: "/attendant", 
    icon: Package,
    badge: "pending"
  }
];

export function AttendantSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useUnifiedAuth();
  const { stats } = useAttendant();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const getBadgeCount = (badgeType: string | null) => {
    if (!badgeType || !stats) return null;
    
    switch (badgeType) {
      case 'pending':
        return stats.pending_orders > 0 ? stats.pending_orders : null;
      case 'preparing':
        return stats.preparing_orders > 0 ? stats.preparing_orders : null;
      default:
        return null;
    }
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-pizza-red/10 text-pizza-red font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar className="border-r glass">
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent className="p-4">
        {/* User Profile */}
        {!collapsed && (
          <div className="mb-6 p-4 rounded-lg glass">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-pizza-red text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Atendente
                </p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-pizza-dark font-semibold">
            Painel de Controle
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const badgeCount = getBadgeCount(item.badge);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => `${getNavCls({ isActive })} flex items-center justify-between w-full p-3 rounded-lg transition-all`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </div>
                        {badgeCount && (
                          <Badge 
                            variant="destructive" 
                            className="bg-pizza-red hover:bg-pizza-red/90 text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse"
                          >
                            {badgeCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <div className="mt-auto pt-4 space-y-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}