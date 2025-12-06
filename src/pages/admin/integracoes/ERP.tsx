import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Plus, Settings, Trash2, Play, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useERPConfigurations } from '@/hooks/useERPConfigurations';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ERP_SYSTEMS = [
  { value: 'sap', label: 'SAP' },
  { value: 'totvs', label: 'TOTVS' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'bling', label: 'Bling' },
  { value: 'omie', label: 'Omie' },
  { value: 'tiny', label: 'Tiny ERP' },
  { value: 'custom', label: 'Personalizado' },
];

const SYNC_FREQUENCIES = [
  { value: 'manual', label: 'Manual' },
  { value: 'hourly', label: 'A cada hora' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'realtime', label: 'Tempo real' },
];

export default function ERP() {
  const {
    configurations,
    syncLogs,
    isLoading,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    testConnection,
    isCreating,
    isUpdating,
    isDeleting,
    isTesting,
  } = useERPConfigurations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    erp_system: 'bling',
    api_endpoint: '',
    api_key: '',
    sync_enabled: true,
    sync_frequency: 'hourly',
  });

  const handleSubmit = () => {
    if (editingId) {
      updateConfiguration({ id: editingId, ...formData });
    } else {
      createConfiguration(formData);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setFormData({
      erp_system: config.erp_system,
      api_endpoint: config.api_endpoint || '',
      api_key: config.api_key || '',
      sync_enabled: config.sync_enabled,
      sync_frequency: config.sync_frequency,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      erp_system: 'bling',
      api_endpoint: '',
      api_key: '',
      sync_enabled: true,
      sync_frequency: 'hourly',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Integrações ERP
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure e gerencie integrações com sistemas ERP
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Integração
        </Button>
      </div>

      {configurations.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma integração ERP configurada. Clique em "Nova Integração" para começar.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs defaultValue="configurations" className="w-full">
          <TabsList>
            <TabsTrigger value="configurations">Configurações</TabsTrigger>
            <TabsTrigger value="logs">Logs de Sincronização</TabsTrigger>
          </TabsList>

          <TabsContent value="configurations" className="space-y-4">
            {configurations.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {ERP_SYSTEMS.find(s => s.value === config.erp_system)?.label}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {config.api_endpoint || 'Nenhum endpoint configurado'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={config.sync_enabled ? 'default' : 'secondary'}>
                        {config.sync_enabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Frequência: {SYNC_FREQUENCIES.find(f => f.value === config.sync_frequency)?.label}
                      </p>
                      {config.last_sync_at && (
                        <p className="text-sm text-muted-foreground">
                          Última sincronização: {format(new Date(config.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(config.id)}
                        disabled={isTesting}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Testar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteConfiguration(config.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            {syncLogs.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhum log de sincronização disponível.
                </AlertDescription>
              </Alert>
            ) : (
              syncLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <p className="font-medium">
                            {log.erp_system} - {log.sync_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {log.records_success}/{log.records_processed} registros
                        </p>
                        {log.records_error > 0 && (
                          <p className="text-sm text-red-500">
                            {log.records_error} erros
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar' : 'Nova'} Integração ERP
            </DialogTitle>
            <DialogDescription>
              Configure a conexão com seu sistema ERP
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="erp_system">Sistema ERP</Label>
              <Select
                value={formData.erp_system}
                onValueChange={(value) => setFormData({ ...formData, erp_system: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ERP_SYSTEMS.map((system) => (
                    <SelectItem key={system.value} value={system.value}>
                      {system.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_endpoint">Endpoint da API</Label>
              <Input
                id="api_endpoint"
                placeholder="https://api.erp.com/v1"
                value={formData.api_endpoint}
                onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Sua chave de API"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync_frequency">Frequência de Sincronização</Label>
              <Select
                value={formData.sync_frequency}
                onValueChange={(value) => setFormData({ ...formData, sync_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sync_enabled">Sincronização Ativa</Label>
              <Switch
                id="sync_enabled"
                checked={formData.sync_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, sync_enabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
