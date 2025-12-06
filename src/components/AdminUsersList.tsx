import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminCustomer, useUnifiedAdminData } from '@/hooks/useUnifiedAdminData';
import { formatDateTime } from '@/utils/formatting';

interface AdminUsersListProps {
  users: AdminCustomer[];
}

export function AdminUsersList() {
  const { stats } = useUnifiedAdminData();
  const users = stats.topCustomers.map(customer => ({
    id: customer.id,
    full_name: customer.name,
    email: '',
    phone: '', // Add phone property
    role: 'customer',
    created_at: new Date().toISOString(),
    totalOrders: customer.orderCount,
    totalSpent: customer.totalSpent
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum usuário encontrado</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.phone && (
                        <p className="text-sm text-muted-foreground">{user.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDateTime(user.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};