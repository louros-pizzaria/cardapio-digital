import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface PlaceholderFeatureProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  status?: 'coming-soon' | 'in-progress' | 'planned';
}

export const PlaceholderFeature = ({ 
  title, 
  description, 
  icon: Icon,
  status = 'coming-soon'
}: PlaceholderFeatureProps) => {
  const statusLabels = {
    'coming-soon': 'Em breve',
    'in-progress': 'Em desenvolvimento',
    'planned': 'Planejado'
  };

  const statusVariants = {
    'coming-soon': 'secondary' as const,
    'in-progress': 'default' as const,
    'planned': 'outline' as const
  };

  return (
    <Card className="p-8 text-center border-dashed border-2">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {Icon ? (
          <Icon className="w-8 h-8 text-muted-foreground" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
        {description}
      </p>
      <Badge variant={statusVariants[status]}>
        {statusLabels[status]}
      </Badge>
    </Card>
  );
};