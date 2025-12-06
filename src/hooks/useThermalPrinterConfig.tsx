// ===== HOOK PARA CONFIGURAÇÕES DA IMPRESSORA TÉRMICA =====

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface PrinterConfig {
  connectionType: 'usb' | 'network';
  printerIP: string;
  enabled: boolean;
  lastTested: string | null;
  testResults: {
    success: boolean;
    message: string;
    timestamp: string;
  }[];
}

const defaultConfig: PrinterConfig = {
  connectionType: 'usb',
  printerIP: '',
  enabled: false,
  lastTested: null,
  testResults: []
};

export const useThermalPrinterConfig = () => {
  const [config, setConfig] = useState<PrinterConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar configuração do localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('thermal-printer-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsed });
      }
    } catch (error) {
      console.error('[THERMAL-CONFIG] Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configurações da impressora');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salvar configuração no localStorage
  const saveConfig = (newConfig: Partial<PrinterConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      localStorage.setItem('thermal-printer-config', JSON.stringify(updatedConfig));
      
      console.log('[THERMAL-CONFIG] ✅ Configuração salva:', updatedConfig);
      toast.success('Configurações salvas');
    } catch (error) {
      console.error('[THERMAL-CONFIG] ❌ Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  // Atualizar tipo de conexão
  const setConnectionType = (type: 'usb' | 'network') => {
    saveConfig({ connectionType: type });
  };

  // Atualizar IP da impressora
  const setPrinterIP = (ip: string) => {
    saveConfig({ printerIP: ip });
  };

  // Ativar/desativar impressora
  const setEnabled = (enabled: boolean) => {
    saveConfig({ enabled });
  };

  // Adicionar resultado de teste
  const addTestResult = (result: { success: boolean; message: string }) => {
    const testResult = {
      ...result,
      timestamp: new Date().toISOString()
    };

    const updatedResults = [testResult, ...config.testResults].slice(0, 10); // Manter só os últimos 10
    
    saveConfig({
      lastTested: testResult.timestamp,
      testResults: updatedResults
    });
  };

  // Limpar histórico de testes
  const clearTestHistory = () => {
    saveConfig({
      testResults: [],
      lastTested: null
    });
    toast.success('Histórico de testes limpo');
  };

  // Resetar todas as configurações
  const resetConfig = () => {
    try {
      localStorage.removeItem('thermal-printer-config');
      setConfig(defaultConfig);
      toast.success('Configurações resetadas');
    } catch (error) {
      console.error('[THERMAL-CONFIG] Erro ao resetar:', error);
      toast.error('Erro ao resetar configurações');
    }
  };

  // Exportar configurações
  const exportConfig = () => {
    try {
      const configData = JSON.stringify(config, null, 2);
      const blob = new Blob([configData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `thermal-printer-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success('Configurações exportadas');
    } catch (error) {
      console.error('[THERMAL-CONFIG] Erro ao exportar:', error);
      toast.error('Erro ao exportar configurações');
    }
  };

  // Importar configurações
  const importConfig = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target?.result as string);
          const validatedConfig = { ...defaultConfig, ...importedConfig };
          
          setConfig(validatedConfig);
          localStorage.setItem('thermal-printer-config', JSON.stringify(validatedConfig));
          
          toast.success('Configurações importadas com sucesso');
          resolve();
        } catch (error) {
          console.error('[THERMAL-CONFIG] Erro ao importar:', error);
          toast.error('Arquivo de configuração inválido');
          reject(error);
        }
      };
      
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        reject(new Error('File read error'));
      };
      
      reader.readAsText(file);
    });
  };

  // Memorizar config para evitar mudanças desnecessárias
  const memoizedConfig = useMemo(() => config, [
    config.connectionType,
    config.printerIP,
    config.enabled,
    config.lastTested,
    config.testResults.length
  ]);

  return {
    config: memoizedConfig,
    isLoading,
    setConnectionType,
    setPrinterIP,
    setEnabled,
    addTestResult,
    clearTestHistory,
    resetConfig,
    exportConfig,
    importConfig,
    saveConfig
  };
};