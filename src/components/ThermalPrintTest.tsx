// ===== COMPONENTE DE TESTE DE IMPRESSORA TÉRMICA =====

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Printer, Wifi, Usb, TestTube, History, Download, Upload, RotateCcw } from "lucide-react";
import { useThermalPrint } from "@/hooks/useThermalPrint";
import { useThermalPrinterConfig } from "@/hooks/useThermalPrinterConfig";
import { Badge } from "@/components/ui/badge";

export const ThermalPrintTest = () => {
  const { testPrinter, isPrinting, lastPrintResult } = useThermalPrint();
  const {
    config,
    isLoading,
    setConnectionType,
    setPrinterIP,
    setEnabled,
    clearTestHistory,
    resetConfig,
    exportConfig,
    importConfig
  } = useThermalPrinterConfig();
  
  const [showHistory, setShowHistory] = useState(false);

  const handleTest = async () => {
    try {
      await testPrinter();
    } catch (error) {
      console.error('Teste falhou:', error);
    }
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importConfig(file);
      event.target.value = ''; // Reset input
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Printer className="w-8 h-8 animate-pulse mx-auto mb-2" />
            <p>Carregando configurações...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Configuração Impressora Térmica Elgin
        </CardTitle>
        <CardDescription>
          Configure e teste sua impressora térmica para comandas
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sistema Ativo */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            <Label className="font-medium">Sistema de Impressão</Label>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={setEnabled}
          />
        </div>
        
        {/* Tipo de Conexão */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Tipo de Conexão</Label>
          <div className="flex gap-3">
            <Button
              variant={config.connectionType === 'usb' ? 'default' : 'outline'}
              onClick={() => setConnectionType('usb')}
              className="flex-1"
              disabled={!config.enabled}
            >
              <Usb className="w-4 h-4 mr-2" />
              USB
            </Button>
            <Button
              variant={config.connectionType === 'network' ? 'default' : 'outline'}
              onClick={() => setConnectionType('network')}
              className="flex-1"
              disabled={!config.enabled}
            >
              <Wifi className="w-4 h-4 mr-2" />
              Rede
            </Button>
          </div>
        </div>

        {/* Configuração de Rede */}
        {config.connectionType === 'network' && (
          <div className="space-y-2">
            <Label htmlFor="printer-ip">IP da Impressora</Label>
            <Input
              id="printer-ip"
              placeholder="192.168.1.100"
              value={config.printerIP}
              onChange={(e) => setPrinterIP(e.target.value)}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Configure o IP fixo da impressora na sua rede
            </p>
          </div>
        )}

        <Separator />

        {/* Teste de Impressão */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Teste de Funcionamento</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleTest}
              disabled={!config.enabled || isPrinting || (config.connectionType === 'network' && !config.printerIP)}
              className="w-full"
              size="lg"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isPrinting ? 'Testando...' : 'Testar Impressão'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full"
              size="lg"
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          </div>
        </div>

        {/* Histórico de Testes */}
        {showHistory && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Histórico de Testes</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={clearTestHistory}
                disabled={config.testResults.length === 0}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            </div>
            
            {config.testResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum teste realizado ainda
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {config.testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                        {result.success ? 'OK' : 'ERRO'}
                      </Badge>
                      <span className="text-xs">{result.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Resultado do Último Teste */}
        {lastPrintResult && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Status da Última Impressão</Label>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant={lastPrintResult.success ? 'default' : 'destructive'}>
                  {lastPrintResult.success ? 'Sucesso' : 'Falha'}
                </Badge>
                <span className="text-sm">{lastPrintResult.message}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(lastPrintResult.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Instruções de Setup</Label>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>USB:</strong> Conecte a impressora via cabo USB e instale os drivers Elgin</p>
            <p><strong>Rede:</strong> Configure IP fixo na impressora e garanta que está na mesma rede</p>
            <p><strong>Papel:</strong> Use papel térmico 58mm ou 80mm</p>
            <p><strong>Teste:</strong> Sempre teste antes de usar em produção</p>
          </div>
        </div>

        {/* Gerenciamento de Configurações */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Gerenciar Configurações</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportConfig}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Exportar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="text-xs relative"
            >
              <Upload className="w-3 h-3 mr-1" />
              Importar
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetConfig}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Status da Integração */}
        <div className={`p-4 border rounded-lg ${
          config.enabled 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`flex items-center gap-2 ${
            config.enabled ? 'text-green-800' : 'text-gray-600'
          }`}>
            <Printer className="w-4 h-4" />
            <span className="font-medium">
              Sistema de Impressão {config.enabled ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            config.enabled ? 'text-green-600' : 'text-gray-500'
          }`}>
            {config.enabled 
              ? 'Edge Function configurada e pronta para uso'
              : 'Ative o sistema para começar a usar'
            }
          </p>
          {config.lastTested && (
            <p className="text-xs text-muted-foreground mt-1">
              Último teste: {new Date(config.lastTested).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};