import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { Skeleton } from '@/components/ui/skeleton';

export default function PagamentoOnline() {
  const { settings, isLoading, saveSettings, isSaving } = usePaymentSettings();
  
  const [pix, setPix] = useState(true);
  const [credit, setCredit] = useState(true);
  const [debit, setDebit] = useState(true);
  const [creditFee, setCreditFee] = useState('0');
  const [debitFee, setDebitFee] = useState('0');

  useEffect(() => {
    if (settings) {
      setPix(settings.online.pix);
      setCredit(settings.online.creditCard);
      setDebit(settings.online.debitCard);
      setCreditFee(settings.online.creditFee.toString());
      setDebitFee(settings.online.debitFee.toString());
    }
  }, [settings]);

  const handleSave = () => {
    if (!settings) return;
    
    saveSettings({
      online: {
        pix,
        creditCard: credit,
        creditFee: parseFloat(creditFee) || 0,
        debitCard: debit,
        debitFee: parseFloat(debitFee) || 0,
      },
      inPerson: settings.inPerson,
      general: settings.general,
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6 space-y-6">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Pagamento Online</h3>
        <p className="text-sm text-muted-foreground">
          Configure as formas de pagamento online aceitas
        </p>
      </div>

      <Separator />

      {/* PIX */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="pix" className="font-medium">PIX</Label>
            <p className="text-sm text-muted-foreground">Pagamento instantâneo via PIX</p>
          </div>
          <Switch id="pix" checked={pix} onCheckedChange={setPix} />
        </div>
      </div>

      <Separator />

      {/* Cartão de Crédito */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="credit" className="font-medium">Cartão de Crédito</Label>
            <p className="text-sm text-muted-foreground">Aceitar pagamentos com cartão de crédito</p>
          </div>
          <Switch id="credit" checked={credit} onCheckedChange={setCredit} />
        </div>

        {credit && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="credit-fee">Taxa de processamento (%)</Label>
            <Input
              id="credit-fee"
              type="number"
              step="0.1"
              value={creditFee}
              onChange={(e) => setCreditFee(e.target.value)}
              className="w-32"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Cartão de Débito */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="debit" className="font-medium">Cartão de Débito</Label>
            <p className="text-sm text-muted-foreground">Aceitar pagamentos com cartão de débito</p>
          </div>
          <Switch id="debit" checked={debit} onCheckedChange={setDebit} />
        </div>

        {debit && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="debit-fee">Taxa de processamento (%)</Label>
            <Input
              id="debit-fee"
              type="number"
              step="0.1"
              value={debitFee}
              onChange={(e) => setDebitFee(e.target.value)}
              className="w-32"
            />
          </div>
        )}
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </Card>
  );
}
