import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useStoreSchedule } from '@/hooks/useStoreSchedule';
import { validatePeriod, type DaySchedule } from '@/utils/scheduleValidation';

const initialSchedules: DaySchedule[] = [
  { dayId: 0, dayName: 'Domingo', isOpen: false, periods: [{ start: '00:00', end: '01:00' }] },
  { dayId: 1, dayName: 'Segunda-feira', isOpen: true, periods: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
  { dayId: 2, dayName: 'Terça-feira', isOpen: true, periods: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
  { dayId: 3, dayName: 'Quarta-feira', isOpen: true, periods: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
  { dayId: 4, dayName: 'Quinta-feira', isOpen: true, periods: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
  { dayId: 5, dayName: 'Sexta-feira', isOpen: true, periods: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '23:00' }] },
  { dayId: 6, dayName: 'Sábado', isOpen: true, periods: [{ start: '11:00', end: '23:00' }] },
];

export default function Horarios() {
  const { scheduleData, isLoading, saveSchedule, isSaving } = useStoreSchedule();
  
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [schedules, setSchedules] = useState<DaySchedule[]>(initialSchedules);
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Carregar dados do banco quando disponíveis
  useEffect(() => {
    if (scheduleData) {
      setAutoSchedule(scheduleData.autoSchedule);
      setSchedules(scheduleData.schedules);
      setAdditionalInfo(scheduleData.additionalInfo);
    }
  }, [scheduleData]);

  const toggleDayOpen = (dayId: number) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayId === dayId 
        ? { ...schedule, isOpen: !schedule.isOpen }
        : schedule
    ));
  };

  const addPeriod = (dayId: number) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayId === dayId 
        ? { ...schedule, periods: [...schedule.periods, { start: '00:00', end: '00:00' }] }
        : schedule
    ));
  };

  const removePeriod = (dayId: number, periodIndex: number) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayId === dayId 
        ? { ...schedule, periods: schedule.periods.filter((_, i) => i !== periodIndex) }
        : schedule
    ));
  };

  const updatePeriod = (dayId: number, periodIndex: number, field: 'start' | 'end', value: string) => {
    setSchedules(prev => prev.map(schedule => {
      if (schedule.dayId !== dayId) return schedule;
      
      const newPeriods = schedule.periods.map((period, i) => 
        i === periodIndex ? { ...period, [field]: value } : period
      );
      
      // Validar período atualizado
      const validation = validatePeriod(newPeriods[periodIndex]);
      if (!validation.valid) {
        toast.error(validation.error);
      }
      
      return { ...schedule, periods: newPeriods };
    }));
  };

  const handleSave = () => {
    saveSchedule({ autoSchedule, schedules, additionalInfo });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Horário de Funcionamento</h2>
        <p className="text-muted-foreground">
          Configure os horários de funcionamento da loja
        </p>
      </div>

      <Card className="p-6">
        {/* Toggle de horário automático */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b">
          <div>
            <Label htmlFor="auto-schedule" className="text-base font-semibold">
              Habilitar horário de funcionamento automático?
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Quando ativado, os pedidos só serão aceitos nos horários configurados
            </p>
          </div>
          <Switch
            id="auto-schedule"
            checked={autoSchedule}
            onCheckedChange={setAutoSchedule}
          />
        </div>

        {/* Tabela de dias */}
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.dayId} className="space-y-3 pb-4 border-b last:border-0">
              {/* Header do dia */}
              <div className="flex items-center gap-4">
                <div className="w-40">
                  <Label className="font-semibold">{schedule.dayName}</Label>
                </div>
                
                {/* Toggle Aberto/Fechado */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={schedule.isOpen ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDayOpen(schedule.dayId)}
                    className="w-20"
                  >
                    Aberto
                  </Button>
                  <Button
                    type="button"
                    variant={!schedule.isOpen ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDayOpen(schedule.dayId)}
                    className="w-20"
                  >
                    Fechado
                  </Button>
                </div>
              </div>

              {/* Períodos */}
              {schedule.isOpen && (
                <div className="ml-44 space-y-2">
                  {schedule.periods.map((period, periodIndex) => (
                    <div key={periodIndex} className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground w-20">
                        Período {periodIndex + 1}
                      </Label>
                      <Input
                        type="time"
                        value={period.start}
                        onChange={(e) => updatePeriod(schedule.dayId, periodIndex, 'start', e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={period.end}
                        onChange={(e) => updatePeriod(schedule.dayId, periodIndex, 'end', e.target.value)}
                        className="w-32"
                      />
                      
                      {/* Botões de adicionar/remover */}
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => addPeriod(schedule.dayId)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        {schedule.periods.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removePeriod(schedule.dayId, periodIndex)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Informações adicionais */}
        <div className="space-y-2">
          <Label htmlFor="additional-info">Informações adicionais</Label>
          <Textarea
            id="additional-info"
            placeholder="Ex: Fechado em feriados nacionais..."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Botão de salvar */}
        <div className="pt-6">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? 'Salvando...' : 'Salvar e Publicar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
