// ===== LOADING SPINNER OTIMIZADO PARA NAVEGAÇÃO =====

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OptimizedLoadingSpinnerProps {
  variant?: 'minimal' | 'page' | 'component';
  className?: string;
}

export const OptimizedLoadingSpinner = ({ 
  variant = 'minimal',
  className 
}: OptimizedLoadingSpinnerProps) => {
  
  if (variant === 'minimal') {
    return (
      <div className={cn(
        "flex items-center justify-center p-2",
        className
      )}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (variant === 'component') {
    return (
      <div className={cn(
        "flex flex-col space-y-3 p-4",
        className
      )}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  // page variant
  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center",
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
};