interface Period {
  start: string;
  end: string;
}

interface DaySchedule {
  dayId: number;
  dayName: string;
  isOpen: boolean;
  periods: Period[];
}

/**
 * Converte horário HH:MM em minutos desde meia-noite
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Retorna o próximo horário de abertura
 */
function getNextOpeningTime(schedules: DaySchedule[]): string | null {
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
}

/**
 * Loga tentativa de pedido fora do horário
 */
async function logClosedAttempt(
  supabaseClient: any,
  userId: string,
  userEmail: string | null,
  cartData: { items: any[]; total: number }
) {
  try {
    await supabaseClient.from('store_closed_attempts').insert({
      user_id: userId,
      user_email: userEmail,
      cart_value: cartData.total,
      cart_items_count: cartData.items.length,
      source: 'web',
    });
  } catch (error) {
    console.error('[SCHEDULE_VALIDATOR] Error logging attempt:', error);
    // Não falhar se logging falhar
  }
}

/**
 * Valida se a loja está aberta no momento
 */
export async function validateStoreIsOpen(
  supabaseClient: any,
  userId?: string,
  userEmail?: string | null,
  cartData?: { items: any[]; total: number }
): Promise<{ isOpen: boolean; error?: string; nextOpening?: string }> {
  try {
    // Buscar configurações de horário
    const { data: settings, error } = await supabaseClient
      .from('store_settings')
      .select('auto_schedule, schedules')
      .limit(1)
      .single();

    if (error) {
      console.error('[SCHEDULE_VALIDATOR] Error fetching settings:', error);
      // Em caso de erro, permitir pedido (fail-safe)
      return { isOpen: true };
    }

    // Se horário automático está desabilitado, sempre permitir
    if (!settings.auto_schedule) {
      return { isOpen: true };
    }

    const schedules = settings.schedules as DaySchedule[];
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentMinutes = timeToMinutes(currentTime);

    const todaySchedule = schedules.find(s => s.dayId === currentDay);

    if (!todaySchedule || !todaySchedule.isOpen) {
      const nextOpening = getNextOpeningTime(schedules);
      
      // Logar tentativa
      if (userId && cartData) {
        await logClosedAttempt(supabaseClient, userId, userEmail || null, cartData);
      }
      
      return {
        isOpen: false,
        error: 'Loja fechada no momento',
        nextOpening: nextOpening || undefined
      };
    }

    // Verificar se está dentro de algum período
    const isInPeriod = todaySchedule.periods.some(period => {
      const startMinutes = timeToMinutes(period.start);
      const endMinutes = timeToMinutes(period.end);
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    });

    if (!isInPeriod) {
      const nextOpening = getNextOpeningTime(schedules);
      
      // Logar tentativa
      if (userId && cartData) {
        await logClosedAttempt(supabaseClient, userId, userEmail || null, cartData);
      }
      
      return {
        isOpen: false,
        error: 'Fora do horário de funcionamento',
        nextOpening: nextOpening || undefined
      };
    }

    return { isOpen: true };
  } catch (error) {
    console.error('[SCHEDULE_VALIDATOR] Unexpected error:', error);
    // Fail-safe: permitir em caso de erro inesperado
    return { isOpen: true };
  }
}
