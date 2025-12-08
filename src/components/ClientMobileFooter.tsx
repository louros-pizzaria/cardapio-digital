import { Home, Package, ShoppingCart, FileText, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnifiedStore } from "@/stores/simpleStore";
import { Badge } from "@/components/ui/badge";

export function ClientMobileFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useUnifiedStore();
  const itemCount = getItemCount();

  const items = [
    { title: "Início", url: "/dashboard", icon: Home },
    { title: "Cardápio", url: "/menu", icon: Package },
    { title: "Carrinho", url: "/checkout", icon: ShoppingCart, badge: itemCount > 0 ? itemCount : undefined },
    { title: "Pedidos", url: "/orders", icon: FileText },
    { title: "Conta", url: "/account", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t h-16 flex items-center justify-around z-50 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
      {items.map((item) => {
        const isActive = location.pathname === item.url;
        const Icon = item.icon;
        return (
          <button
            key={item.url}
            onClick={() => navigate(item.url)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 relative",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {item.badge !== undefined && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                >
                  {item.badge}
                </Badge>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.title}</span>
          </button>
        );
      })}
    </div>
  );
}
