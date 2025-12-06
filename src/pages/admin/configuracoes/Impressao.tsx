import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Printer, TestTube, CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useThermalPrinterConfig } from '@/hooks/useThermalPrinterConfig';
import { useThermalPrint } from '@/hooks/useThermalPrint';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ThermalPrintPreviewDialog } from '@/components/ThermalPrintPreviewDialog';
import { formatOrderForPreview } from '@/utils/thermalPrintFormatter';
import { mockTestOrder } from '@/utils/mockThermalData';

export default function Impressao() {
  const { config, setConnectionType, setPrinterIP, setEnabled, saveConfig, isLoading } = useThermalPrinterConfig();
  const { testPrinter, isPrinting } = useThermalPrint();
  
  const [localIP, setLocalIP] = useState(config.printerIP);
  const [localType, setLocalType] = useState(config.connectionType);
  const [localEnabled, setLocalEnabled] = useState(config.enabled);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLines, setPreviewLines] = useState<any[]>([]);

  const handleSave = async () => {
    await saveConfig({
      connectionType: localType,
      printerIP: localIP,
      enabled: localEnabled,
    });
    toast.success('Configurações salvas com sucesso!');
  };

  const handleTest = async () => {
    await testPrinter(localType === 'network' ? localIP : undefined);
  };

  const handlePreview = () => {
    const lines = formatOrderForPreview(mockTestOrder);
    setPreviewLines(lines);
    setShowPreview(true);
  };

  const handlePrintFromPreview = async () => {
    await handleTest();
  };

  const lastTest = config.testResults?.[0];

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Configurações de Impressora Térmica Elgin i7 Plus
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure sua impressora térmica USB para impressão automática de comandas
            </p>
          </div>
          {lastTest && (
            <Badge variant={lastTest.success ? "default" : "destructive"} className="gap-1">
              {lastTest.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {lastTest.success ? 'Funcionando' : 'Com erro'}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Alert quando ativada */}
        {localEnabled && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Impressão automática ativada</AlertTitle>
            <AlertDescription className="text-green-700">
              Todos os pedidos confirmados serão impressos automaticamente. 
              Os atendentes verão um indicador no painel quando esta função estiver ativa.
            </AlertDescription>
          </Alert>
        )}

        {/* Ativação */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="thermal-enabled">Impressão automática</Label>
            <p className="text-sm text-muted-foreground">
              Imprimir automaticamente ao receber novos pedidos
            </p>
          </div>
          <Switch 
            id="thermal-enabled" 
            checked={localEnabled}
            onCheckedChange={setLocalEnabled}
          />
        </div>

        {/* Tipo de impressora */}
        <div className="space-y-2">
          <Label htmlFor="printer-type">Tipo de conexão</Label>
          <Select value={localType} onValueChange={(value: 'usb' | 'network') => setLocalType(value)}>
            <SelectTrigger id="printer-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usb">USB (Recomendado para Elgin i7 Plus)</SelectItem>
              <SelectItem value="network">Rede (IP)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A Elgin i7 Plus funciona melhor via USB
          </p>
        </div>

        {/* Endereço IP (se rede) */}
        {localType === 'network' && (
          <div className="space-y-2">
            <Label htmlFor="printer-ip">Endereço IP da impressora</Label>
            <Input
              id="printer-ip"
              type="text"
              value={localIP}
              onChange={(e) => setLocalIP(e.target.value)}
              placeholder="192.168.1.100"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Apenas para impressoras de rede
            </p>
          </div>
        )}

        {/* Histórico de testes */}
        {config.testResults && config.testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Últimos testes</Label>
              <div className="space-y-2">
                {config.testResults.slice(0, 3).map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={result.success ? 'text-green-600' : 'text-destructive'}>
                      {result.message}
                    </span>
                  </div>
                ))}
              </div>
              {config.lastTested && (
                <p className="text-xs text-muted-foreground">
                  Último teste: {new Date(config.lastTested).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={isLoading}>
            Salvar Configurações
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleTest}
            disabled={isPrinting || !localEnabled}
          >
            <TestTube className="h-4 w-4" />
            {isPrinting ? 'Testando...' : 'Testar Impressão'}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handlePreview}
          >
            <Eye className="h-4 w-4" />
            Visualizar Comanda
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">📝 Instruções de instalação</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Conecte a impressora Elgin i7 Plus via cabo USB ao computador</li>
            <li>Instale os drivers da Elgin (disponíveis no site do fabricante)</li>
            <li>Certifique-se que a impressora está ligada e com papel</li>
            <li>Clique em "Testar Impressão" para verificar a conexão</li>
            <li>Se funcionar, ative a "Impressão automática"</li>
          </ol>
        </div>
      </Card>

      <ThermalPrintPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        lines={previewLines}
        onConfirm={handlePrintFromPreview}
        title="Preview de Teste"
        description="Visualize como ficará a comanda de teste na impressora térmica"
      />
    </div>
  );
}
