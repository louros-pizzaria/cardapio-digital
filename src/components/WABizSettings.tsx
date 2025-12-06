// ===== SETTINGS DRAWER - CONFIGURAÇÕES DO ATENDENTE =====

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Printer, MessageSquare, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SoundSettings } from "@/components/SoundSettings";

interface WABizSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMessages?: () => void;
}

export const WABizSettings = ({ 
  isOpen, 
  onClose, 
  onOpenMessages 
}: WABizSettingsProps) => {
  // Estados locais temporários (não salvam automaticamente)
  const [autoAccept, setAutoAccept] = useState(false);
  const [printCopies, setPrintCopies] = useState("1");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Guardar valores originais para comparação
  const [originalAutoAccept, setOriginalAutoAccept] = useState(false);

  // Carregar configurações da loja
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('auto_accept_orders')
          .single();

        if (error) throw error;
        if (data) {
          setAutoAccept(data.auto_accept_orders || false);
          setOriginalAutoAccept(data.auto_accept_orders || false);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    if (isOpen) {
      loadSettings();
      // Carregar cópias do localStorage
      const savedCopies = localStorage.getItem('print_copies');
      if (savedCopies) {
        setPrintCopies(savedCopies);
      }
    }
  }, [isOpen]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Salvar auto-accept no banco
      const { error } = await supabase
        .from('store_settings')
        .update({ auto_accept_orders: autoAccept })
        .eq('id', (await supabase.from('store_settings').select('id').single()).data?.id);

      if (error) throw error;

      // Salvar cópias no localStorage
      localStorage.setItem('print_copies', printCopies);
      
      setOriginalAutoAccept(autoAccept);
      toast.success("Configurações salvas com sucesso!");
      onClose();
    } catch (error: any) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = autoAccept !== originalAutoAccept;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[450px] sm:max-w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Atendente
          </SheetTitle>
          <SheetDescription>
            Ajuste as preferências do sistema
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="sound">
              <Volume2 className="h-4 w-4 mr-2" />
              Sons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            {/* Auto Aceitar Pedidos */}
            <div className="space-y-2">
              <Label htmlFor="auto-accept" className="text-sm font-medium">
                Auto Aceitar Pedidos
              </Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Aceitar pedidos automaticamente
                </p>
                <Switch
                  id="auto-accept"
                  checked={autoAccept}
                  onCheckedChange={setAutoAccept}
                  disabled={loading || saving}
                />
              </div>
            </div>

            {/* Cópias de Impressão */}
            <div className="space-y-2">
              <Label htmlFor="print-copies" className="text-sm font-medium flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Cópias de Impressão
              </Label>
              <Input
                id="print-copies"
                type="number"
                min="1"
                max="5"
                value={printCopies}
                onChange={(e) => setPrintCopies(e.target.value)}
                className="w-24"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Número de cópias padrão ao imprimir (1-5)
              </p>
            </div>

            {/* Botão Central de Mensagens */}
            {onOpenMessages && (
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    onClose();
                    onOpenMessages();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Central de Mensagens
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Acesse todos os chats dos pedidos
                </p>
              </div>
            )}

            {/* Botão de Salvar */}
            <div className="pt-6 border-t">
              <Button 
                onClick={handleSaveSettings}
                disabled={saving || loading || !hasChanges}
                className="w-full"
                size="lg"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              {!hasChanges && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Nenhuma alteração pendente
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sound" className="mt-6">
            <SoundSettings />
          </TabsContent>
        </Tabs>

      </SheetContent>
    </Sheet>
  );
};
