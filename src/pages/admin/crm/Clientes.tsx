import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Filter, Download, Eye, Mail, Phone, MapPin, Star } from 'lucide-react';
import { useUnifiedAdminData } from '@/hooks/useUnifiedAdminData';
import { formatCurrency } from '@/utils/formatting';
import { VirtualizedList } from '@/components/VirtualizedList';

export default function Clientes() {
  const { stats } = useUnifiedAdminData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [tierFilter, setTierFilter] = useState('all');

  // Convert top customers to full customer list
  const customers = stats.topCustomers.map((customer, index) => ({
    id: customer.id,
    name: customer.name,
    email: `cliente${index + 1}@email.com`,
    phone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    orders: customer.orderCount,
    totalSpent: customer.totalSpent,
    avgTicket: customer.totalSpent / customer.orderCount,
    lastOrder: `${Math.floor(Math.random() * 30)} dias`,
    tier: customer.orderCount >= 15 ? 'VIP' : customer.orderCount >= 5 ? 'Frequente' : 'Regular',
    registeredAt: '2024-01-15',
    address: 'Rua Exemplo, 123',
  }));

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = tierFilter === 'all' || customer.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return 'default';
      case 'Frequente': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros e Busca */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tiers</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="Frequente">Frequente</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="default">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Lista de Clientes */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            Clientes ({filteredCustomers.length})
          </h3>
        </div>
        
        {filteredCustomers.length > 20 ? (
          <div style={{ height: '600px' }}>
            <VirtualizedList
              items={filteredCustomers}
              estimateSize={80}
              renderItem={(customer) => (
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex-1 grid grid-cols-8 gap-4 items-center">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Cliente desde {customer.registeredAt}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                    <div>
                      <Badge variant="outline">{customer.orders}</Badge>
                    </div>
                    <div className="font-bold">
                      {formatCurrency(customer.totalSpent)}
                    </div>
                    <div>
                      {formatCurrency(customer.avgTicket)}
                    </div>
                    <div className="text-muted-foreground">
                      {customer.lastOrder}
                    </div>
                    <div>
                      <Badge variant={getTierColor(customer.tier)}>
                        {customer.tier === 'VIP' && <Star className="h-3 w-3 mr-1" />}
                        {customer.tier}
                      </Badge>
                    </div>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total Gasto</TableHead>
                  <TableHead>Ticket Médio</TableHead>
                  <TableHead>Último Pedido</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Cliente desde {customer.registeredAt}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.orders}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(customer.totalSpent)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(customer.avgTicket)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.lastOrder}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTierColor(customer.tier)}>
                        {customer.tier === 'VIP' && <Star className="h-3 w-3 mr-1" />}
                        {customer.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Dialog de Detalhes do Cliente */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações completas e histórico do cliente
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Info Principal */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nome</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tier</p>
                  <Badge variant={getTierColor(selectedCustomer.tier)}>
                    {selectedCustomer.tier}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="text-sm">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                  <p className="text-sm">{selectedCustomer.phone}</p>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total de Pedidos</p>
                  <p className="text-2xl font-bold">{selectedCustomer.orders}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Gasto</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.avgTicket)}</p>
                </Card>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço Principal
                </p>
                <Card className="p-4">
                  <p>{selectedCustomer.address}</p>
                </Card>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email
                </Button>
                <Button variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
