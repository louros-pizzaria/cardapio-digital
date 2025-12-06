import { PlaceholderFeature } from '@/components/admin/PlaceholderFeature';
import { AdminProductExtras } from '@/components/AdminProductExtras';

export function Extras() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Extras</h2>
        <p className="text-muted-foreground">
          Configure os extras disponíveis para os produtos
        </p>
      </div>
      
      <AdminProductExtras />
    </div>
  );
}
