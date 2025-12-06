// ===== SKELETONS PERSONALIZADOS AVANÇADOS =====

import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface AdvancedSkeletonProps {
  className?: string;
  variant?: 'default' | 'pulse' | 'wave' | 'shimmer';
  lines?: number;
  showAvatar?: boolean;
  showImage?: boolean;
  layout?: 'card' | 'list' | 'table' | 'menu' | 'order' | 'profile' | 'default';
}

export function AdvancedSkeleton({ 
  className,
  variant = 'shimmer',
  lines = 3,
  showAvatar = false,
  showImage = false,
  layout = 'default'
}: AdvancedSkeletonProps) {
  const baseClasses = cn(
    "animate-pulse",
    variant === 'wave' && "animate-[wave_1.6s_ease-in-out_infinite]",
    variant === 'shimmer' && "animate-[shimmer_2s_ease-in-out_infinite]",
    variant === 'pulse' && "animate-pulse",
    className
  );

  // ===== LAYOUTS ESPECÍFICOS =====
  
  if (layout === 'card') {
    return (
      <div className={cn("p-4 border rounded-lg space-y-4", baseClasses)}>
        {showImage && <Skeleton className="h-48 w-full rounded-md" />}
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    );
  }

  if (layout === 'menu') {
    return (
      <div className={cn("space-y-4", baseClasses)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <Skeleton className="h-16 w-16 rounded-md flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'order') {
    return (
      <div className={cn("p-4 border rounded-lg space-y-4", baseClasses)}>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between font-medium">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'profile') {
    return (
      <div className={cn("space-y-6", baseClasses)}>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'table') {
    return (
      <div className={cn("space-y-2", baseClasses)}>
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 p-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className={cn("space-y-3", baseClasses)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===== LAYOUT PADRÃO =====
  return (
    <div className={cn("space-y-2", baseClasses)}>
      {showAvatar && <Skeleton className="h-12 w-12 rounded-full" />}
      {showImage && <Skeleton className="h-32 w-full rounded-md mb-4" />}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === 0 && "w-3/4",
            i === 1 && "w-1/2", 
            i === 2 && "w-2/3",
            i > 2 && "w-3/5"
          )} 
        />
      ))}
    </div>
  );
}

// ===== SKELETON COM PROGRESSO =====
interface ProgressSkeletonProps {
  progress: number;
  label?: string;
  className?: string;
}

export function ProgressSkeleton({ progress, label, className }: ProgressSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span>{label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

// ===== SKELETON COM TIMEOUT VISUAL =====
interface TimeoutSkeletonProps {
  timeout: number; // em segundos
  onTimeout?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function TimeoutSkeleton({ timeout, onTimeout, children, className }: TimeoutSkeletonProps) {
  const [timeLeft, setTimeLeft] = React.useState(timeout);
  const [isTimeout, setIsTimeout] = React.useState(false);

  React.useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!isTimeout) {
      setIsTimeout(true);
      onTimeout?.();
    }
  }, [timeLeft, isTimeout, onTimeout]);

  const progress = ((timeout - timeLeft) / timeout) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {children}
      
      {timeLeft > 0 && (
        <div className="text-center space-y-2">
          <ProgressSkeleton 
            progress={progress} 
            label={`Tempo limite: ${timeLeft}s`}
          />
          {timeLeft <= 10 && (
            <p className="text-sm text-destructive">
              Operação expirando em {timeLeft} segundos...
            </p>
          )}
        </div>
      )}
      
      {isTimeout && (
        <div className="text-center p-4 bg-destructive/10 rounded-lg">
          <p className="text-destructive">Tempo limite excedido</p>
        </div>
      )}
    </div>
  );
}