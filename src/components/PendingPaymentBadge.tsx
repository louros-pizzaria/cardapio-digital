// ===== BADGE DE PAGAMENTOS PENDENTES =====

import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingPaymentBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export const PendingPaymentBadge = ({ count, onClick, className }: PendingPaymentBadgeProps) => {
  if (count === 0) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "cursor-pointer hover:bg-secondary/80 transition-colors animate-pulse",
        "bg-amber-100 text-amber-800 border-amber-300",
        className
      )}
      onClick={onClick}
    >
      <DollarSign className="h-3 w-3 mr-1" />
      {count} {count === 1 ? 'pagamento' : 'pagamentos'} pendente{count !== 1 && 's'}
    </Badge>
  );
};
