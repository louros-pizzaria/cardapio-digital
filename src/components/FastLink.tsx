// ===== COMPONENTE DE LINK OTIMIZADO COM PRELOAD =====

import { Link, LinkProps } from 'react-router-dom';
import { forwardRef, MouseEvent } from 'react';
import { smartPreload } from '@/utils/routePreloader';
import { cn } from '@/lib/utils';

interface FastLinkProps extends LinkProps {
  preload?: boolean;
  className?: string;
}

// Link otimizado que faz preload no hover
export const FastLink = forwardRef<HTMLAnchorElement, FastLinkProps>(
  ({ to, preload = true, onMouseEnter, className, children, ...props }, ref) => {
    const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
      if (preload && typeof to === 'string') {
        smartPreload.onHover(to);
      }
      onMouseEnter?.(e);
    };

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        className={cn(
          // Otimizações CSS para navegação fluida
          "transition-all duration-200 ease-out will-change-transform",
          "hover:scale-[1.02] active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

FastLink.displayName = 'FastLink';