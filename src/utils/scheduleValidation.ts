import { toast } from 'sonner';

export interface Period {
  start: string;
  end: string;
}

export interface DaySchedule {
  dayId: number;
  dayName: string;
  isOpen: boolean;
  periods: Period[];
}

/**
 * Converte horário HH:MM em minutos desde meia-noite
 */
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Valida se o horário de fim é maior que o de início
 */
export const validatePeriod = (period: Period): { valid: boolean; error?: string } => {
  const startMinutes = timeToMinutes(period.start);
  const endMinutes = timeToMinutes(period.end);

  if (endMinutes <= startMinutes) {
    return {
      valid: false,
      error: `Horário de término (${period.end}) deve ser maior que horário de início (${period.start})`
    };
  }

  return { valid: true };
};

/**
 * Verifica se dois períodos se sobrepõem
 */
const periodsOverlap = (period1: Period, period2: Period): boolean => {
  const start1 = timeToMinutes(period1.start);
  const end1 = timeToMinutes(period1.end);
  const start2 = timeToMinutes(period2.start);
  const end2 = timeToMinutes(period2.end);

  return (start1 < end2 && end1 > start2);
};

/**
 * Valida todos os períodos de um dia (sem sobreposição)
 */
export const validateDaySchedule = (schedule: DaySchedule): { valid: boolean; error?: string } => {
  if (!schedule.isOpen || schedule.periods.length === 0) {
    return { valid: true };
  }

  // Validar cada período individualmente
  for (let i = 0; i < schedule.periods.length; i++) {
    const periodValidation = validatePeriod(schedule.periods[i]);
    if (!periodValidation.valid) {
      return {
        valid: false,
        error: `${schedule.dayName} - Período ${i + 1}: ${periodValidation.error}`
      };
    }
  }

  // Verificar sobreposição entre períodos
  for (let i = 0; i < schedule.periods.length; i++) {
    for (let j = i + 1; j < schedule.periods.length; j++) {
      if (periodsOverlap(schedule.periods[i], schedule.periods[j])) {
        return {
          valid: false,
          error: `${schedule.dayName} - Período ${i + 1} se sobrepõe ao Período ${j + 1}`
        };
      }
    }
  }

  return { valid: true };
};

/**
 * Valida todos os horários da semana
 */
export const validateAllSchedules = (schedules: DaySchedule[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  schedules.forEach(schedule => {
    const validation = validateDaySchedule(schedule);
    if (!validation.valid && validation.error) {
      errors.push(validation.error);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Verifica se a loja está aberta agora
 */
export const isStoreOpenNow = (schedules: DaySchedule[], autoSchedule: boolean): boolean => {
  if (!autoSchedule) {
    return true;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentMinutes = timeToMinutes(currentTime);

  const todaySchedule = schedules.find(s => s.dayId === currentDay);

  if (!todaySchedule || !todaySchedule.isOpen) {
    return false;
  }

  return todaySchedule.periods.some(period => {
    const startMinutes = timeToMinutes(period.start);
    const endMinutes = timeToMinutes(period.end);
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  });
};

/**
 * Retorna o próximo horário de abertura
 */
export const getNextOpeningTime = (schedules: DaySchedule[]): string | null => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentMinutes = timeToMinutes(currentTime);

  // Verificar hoje primeiro
  const todaySchedule = schedules.find(s => s.dayId === currentDay);
  if (todaySchedule && todaySchedule.isOpen) {
    const nextPeriod = todaySchedule.periods.find(p => timeToMinutes(p.start) > currentMinutes);
    if (nextPeriod) {
      return `Hoje às ${nextPeriod.start}`;
    }
  }

  // Verificar próximos 7 dias
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const nextSchedule = schedules.find(s => s.dayId === nextDay);
    
    if (nextSchedule && nextSchedule.isOpen && nextSchedule.periods.length > 0) {
      const firstPeriod = nextSchedule.periods[0];
      return `${nextSchedule.dayName} às ${firstPeriod.start}`;
    }
  }

  return null;
};
