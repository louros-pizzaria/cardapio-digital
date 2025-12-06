// ===== COMPONENTE DE CONFIGURAÇÕES DE SOM =====

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, VolumeX, Play } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { SoundType, PaymentSoundType } from "@/types/soundSettings";

export const SoundSettings = () => {
  const { settings, updateSettings, testSound } = useSound();

  const soundOptions: { value: SoundType; label: string }[] = [
    { value: 'bell', label: '🔔 Sino' },
    { value: 'chime', label: '🎵 Melodia' },
    { value: 'notification', label: '📬 Notificação' },
  ];

  const paymentSoundOptions: { value: PaymentSoundType; label: string }[] = [
    { value: 'success', label: '✅ Sucesso' },
    { value: 'coin', label: '💰 Moeda' },
    { value: 'ding', label: '🔔 Ding' },
  ];

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Configurações de Som</h3>
          <p className="text-sm text-muted-foreground">
            Personalize os sons e notificações do sistema
          </p>
        </div>
        {settings.enabled ? (
          <Volume2 className="h-6 w-6 text-primary" />
        ) : (
          <VolumeX className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Toggle geral */}
      <div className="flex items-center justify-between">
        <Label htmlFor="sound-enabled" className="flex flex-col gap-1 cursor-pointer">
          <span className="font-medium">Ativar sons</span>
          <span className="text-sm text-muted-foreground font-normal">
            Habilitar notificações sonoras
          </span>
        </Label>
        <Switch
          id="sound-enabled"
          checked={settings.enabled}
          onCheckedChange={(enabled) => updateSettings({ enabled })}
        />
      </div>

      {settings.enabled && (
        <>
          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Volume: {settings.volume}%</Label>
            </div>
            <Slider
              value={[settings.volume]}
              onValueChange={([volume]) => updateSettings({ volume })}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Som de novo pedido */}
          <div className="space-y-2">
            <Label>Som de novo pedido</Label>
            <div className="flex gap-2">
              <Select
                value={settings.newOrderSound}
                onValueChange={(value) => updateSettings({ newOrderSound: value as SoundType })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {soundOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => testSound('newOrder')}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Som de pagamento confirmado */}
          <div className="space-y-2">
            <Label>Som de pagamento confirmado</Label>
            <div className="flex gap-2">
              <Select
                value={settings.paymentConfirmedSound}
                onValueChange={(value) => updateSettings({ paymentConfirmedSound: value as PaymentSoundType })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentSoundOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => testSound('payment')}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Repetições */}
          <div className="space-y-2">
            <Label>Número de repetições: {settings.repeatCount}x</Label>
            <Slider
              value={[settings.repeatCount]}
              onValueChange={([repeatCount]) => updateSettings({ repeatCount })}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>

          {/* Intervalo entre repetições */}
          <div className="space-y-2">
            <Label>Intervalo: {settings.intervalBetweenRepeats}ms</Label>
            <Slider
              value={[settings.intervalBetweenRepeats]}
              onValueChange={([intervalBetweenRepeats]) => updateSettings({ intervalBetweenRepeats })}
              min={300}
              max={2000}
              step={100}
              className="w-full"
            />
          </div>
        </>
      )}
    </Card>
  );
};
