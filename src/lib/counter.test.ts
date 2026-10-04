import {
  addDaysISO,
  calendarSpan,
  computeCounter,
  daysBetween,
  describeDates,
  formatNumber,
  isISODate,
  mascotExpression,
  mascotStage,
  milestoneToday,
  nextMilestone,
  nextRefreshDate,
  parseISODate,
  quantitiesFor,
  stageForDays,
  toCounterEvent,
  todayISO,
  type CounterEvent,
  type DisplayUnit,
} from './counter';

function since(start: string, opts: Partial<CounterEvent> = {}): CounterEvent {
  return {
    kind: 'since',
    start_date: start,
    end_date: null,
    count_start_day: false,
    display_unit: 'days',
    ...opts,
  };
}

function until(date: string, unit: DisplayUnit = 'days'): CounterEvent {
  return {
    kind: 'until',
    start_date: date,
    end_date: null,
    count_start_day: false,
    display_unit: unit,
  };
}

function range(start: string, end: string): CounterEvent {
  return {
    kind: 'range',
    start_date: start,
    end_date: end,
    count_start_day: false,
    display_unit: 'days',
  };
}

/** Fecha y hora local. */
function at(iso: string, hour: number, minute = 0): Date {
  const d = parseISODate(iso);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('zona horaria de los tests', () => {
  it('corre en una zona con horario de verano (si no, los tests de DST no prueban nada)', () => {
    const jan = new Date(2026, 0, 15).getTimezoneOffset();
    const jul = new Date(2026, 6, 15).getTimezoneOffset();
    expect(jan).not.toBe(jul);
  });
});

describe('fechas', () => {
  it('parsea fechas válidas y rechaza las que no existen', () => {
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('2026-04-31')).toBe(false);
    expect(isISODate('3/10/2026')).toBe(false);
    expect(() => parseISODate('2026-02-30')).toThrow(RangeError);
  });

  it('hoy es la fecha local del dispositivo, también cerca de medianoche', () => {
    expect(todayISO(new Date(2026, 9, 3, 0, 0, 1))).toBe('2026-10-03');
    expect(todayISO(new Date(2026, 9, 3, 23, 59, 59))).toBe('2026-10-03');
  });

  it('cambio de mes y de año', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(daysBetween('2026-01-31', '2026-03-01')).toBe(29);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('años bisiestos', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2024-01-01', '2025-01-01')).toBe(366);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2099-12-31', '2100-03-01')).toBe(60); // 2100 no es bisiesto
  });

  it('horario de verano: cada día del año dura exactamente 1 día de calendario', () => {
    for (const year of [2026, 2027]) {
      let date = `${year}-01-01`;
      for (let i = 0; i < 365; i++) {
        const next = addDaysISO(date, 1);
        expect(daysBetween(date, next)).toBe(1);
        expect(parseISODate(next).getDate()).not.toBe(parseISODate(date).getDate());
        date = next;
      }
    }
  });

  it('horario de verano: conteos que cruzan los cambios de hora', () => {
    // Chile: abr y sep. Europa: fin de marzo y fin de octubre. EE. UU.: mar y nov.
    expect(daysBetween('2026-03-01', '2026-04-15')).toBe(45);
    expect(daysBetween('2026-09-01', '2026-11-15')).toBe(75);
    expect(computeCounter(since('2026-03-20'), '2026-04-10').text).toBe('21 días');
    // La hora que "no existe" en el cambio de horario sigue siendo ese día.
    expect(todayISO(new Date(2026, 8, 6, 0, 30))).toBe('2026-09-06');
  });

  it('describe las fechas en español', () => {
    expect(describeDates(since('2026-10-03'))).toBe('desde el 3 oct 2026');
    expect(describeDates(until('2027-03-15'))).toBe('el 15 mar 2027');
    expect(describeDates(range('2027-03-01', '2027-06-30'))).toBe('del 1 mar al 30 jun 2027');
    expect(describeDates(range('2026-11-01', '2027-02-01'))).toBe('del 1 nov 2026 al 1 feb 2027');
  });

  it('formatea números grandes', () => {
    expect(formatNumber(4464)).toBe('4464');
    expect(formatNumber(12345)).toBe('12.345');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
});

describe('calendarSpan', () => {
  it('descompone en años, meses y días', () => {
    expect(calendarSpan('2025-08-15', '2026-10-03')).toEqual({
      years: 1,
      months: 1,
      days: 18,
      totalDays: 414,
    });
  });

  it('31 de enero + 1 mes = 28 de febrero', () => {
    expect(calendarSpan('2026-01-31', '2026-02-28')).toMatchObject({
      years: 0,
      months: 1,
      days: 0,
    });
    expect(calendarSpan('2026-01-31', '2026-02-27')).toMatchObject({ months: 0, days: 27 });
  });

  it('29 de febrero', () => {
    expect(calendarSpan('2024-02-29', '2025-02-28')).toMatchObject({
      years: 1,
      months: 0,
      days: 0,
    });
    expect(calendarSpan('2024-02-29', '2025-03-01')).toMatchObject({
      years: 1,
      months: 0,
      days: 1,
    });
    expect(calendarSpan('2024-02-29', '2028-02-29')).toMatchObject({
      years: 4,
      months: 0,
      days: 0,
    });
  });
});

describe('unidades', () => {
  it('auto: hasta 60 días muestra días', () => {
    expect(quantitiesFor('2026-01-01', '2026-03-02', 'auto')).toEqual([
      { value: 60, unit: 'días' },
    ]);
  });

  it('auto: más de 60 días combina unidades (máximo dos)', () => {
    expect(quantitiesFor('2026-01-01', '2026-03-03', 'auto')).toEqual([
      { value: 2, unit: 'meses' },
      { value: 2, unit: 'días' },
    ]);
    expect(quantitiesFor('2025-08-01', '2026-10-03', 'auto')).toEqual([
      { value: 1, unit: 'año' },
      { value: 2, unit: 'meses' },
    ]);
    expect(quantitiesFor('2024-10-03', '2026-10-03', 'auto')).toEqual([{ value: 2, unit: 'años' }]);
  });

  it('semanas, meses y años', () => {
    expect(quantitiesFor('2026-10-01', '2026-10-11', 'weeks')).toEqual([
      { value: 1, unit: 'semana' },
      { value: 3, unit: 'días' },
    ]);
    expect(quantitiesFor('2026-10-01', '2026-10-15', 'weeks')).toEqual([
      { value: 2, unit: 'semanas' },
    ]);
    expect(quantitiesFor('2025-01-10', '2026-03-11', 'months')).toEqual([
      { value: 14, unit: 'meses' },
      { value: 1, unit: 'día' },
    ]);
    expect(quantitiesFor('2026-01-01', '2026-04-11', 'years')).toEqual([
      { value: 3, unit: 'meses' },
    ]);
    expect(quantitiesFor('2026-10-03', '2026-10-03', 'years')).toEqual([
      { value: 0, unit: 'años' },
    ]);
  });
});

describe('since', () => {
  it('cuenta los días transcurridos', () => {
    const view = computeCounter(since('2026-09-02'), '2026-10-03');
    expect(view).toMatchObject({ status: 'counting', days: 31, text: '31 días', prefix: null });
  });

  it('evento con fecha de hoy', () => {
    expect(computeCounter(since('2026-10-03'), '2026-10-03')).toMatchObject({
      days: 0,
      text: '0 días',
      detail: 'Empieza hoy',
    });
    expect(
      computeCounter(since('2026-10-03', { count_start_day: true }), '2026-10-03'),
    ).toMatchObject({
      days: 1,
      text: '1 día',
    });
  });

  it('count_start_day suma 1', () => {
    expect(computeCounter(since('2026-09-02', { count_start_day: true }), '2026-10-03').text).toBe(
      '32 días',
    );
  });

  it('fecha futura: "empieza en X días"', () => {
    expect(computeCounter(since('2026-10-08'), '2026-10-03')).toMatchObject({
      status: 'upcoming',
      text: 'empieza en 5 días',
      prefix: 'empieza en',
    });
    expect(computeCounter(since('2026-10-04'), '2026-10-03').text).toBe('empieza en 1 día');
  });

  it('auto combina unidades y deja el total en el subtítulo', () => {
    const view = computeCounter(since('2025-08-01', { display_unit: 'auto' }), '2026-10-03');
    expect(view.text).toBe('1 año, 2 meses');
    expect(view.detail).toBe('428 días');
  });
});

describe('until', () => {
  it('días que faltan', () => {
    expect(computeCounter(until('2027-03-15'), '2026-10-03')).toMatchObject({
      status: 'remaining',
      days: 163,
      text: 'faltan 163 días',
    });
    expect(computeCounter(until('2026-10-04'), '2026-10-03').text).toBe('falta 1 día');
  });

  it('auto: "faltan 5 meses, 12 días" con el total como subtítulo', () => {
    const view = computeCounter(until('2027-03-15', 'auto'), '2026-10-03');
    expect(view.text).toBe('faltan 5 meses, 12 días');
    expect(view.detail).toBe('163 días');
  });

  it('es hoy', () => {
    expect(computeCounter(until('2026-10-03'), '2026-10-03')).toMatchObject({
      status: 'today',
      text: '¡Hoy!',
      parts: [],
    });
  });

  it('ya pasó', () => {
    expect(computeCounter(until('2026-09-30'), '2026-10-03')).toMatchObject({
      status: 'past',
      days: 3,
      text: 'hace 3 días',
    });
  });

  it('un until el 29 de febrero', () => {
    expect(computeCounter(until('2028-02-29'), '2028-02-28').text).toBe('falta 1 día');
    expect(computeCounter(until('2028-02-29'), '2028-03-01').text).toBe('hace 1 día');
  });
});

describe('range', () => {
  const cursada = range('2027-03-01', '2027-06-30');

  it('durante: "día N de M" con porcentaje', () => {
    const view = computeCounter(cursada, '2027-04-14');
    expect(view).toMatchObject({
      status: 'active',
      text: 'día 45 de 122',
      suffix: 'de 122',
      detail: '37 %',
      range: { day: 45, length: 122 },
    });
    expect(view.progress).toBeCloseTo(45 / 122);
  });

  it('primer y último día', () => {
    expect(computeCounter(cursada, '2027-03-01').text).toBe('día 1 de 122');
    const last = computeCounter(cursada, '2027-06-30');
    expect(last.text).toBe('día 122 de 122');
    expect(last.progress).toBe(1);
  });

  it('antes y después', () => {
    expect(computeCounter(cursada, '2027-02-26')).toMatchObject({
      status: 'upcoming',
      text: 'empieza en 3 días',
      progress: 0,
    });
    expect(computeCounter(cursada, '2027-07-03')).toMatchObject({
      status: 'ended',
      text: 'terminó hace 3 días',
      progress: 1,
    });
  });

  it('período que incluye un 29 de febrero', () => {
    expect(computeCounter(range('2028-02-01', '2028-03-31'), '2028-03-01').text).toBe(
      'día 30 de 60',
    );
  });
});

describe('hitos', () => {
  it('"en 4 días llegás a 1 mes"', () => {
    const next = nextMilestone(since('2026-09-07'), '2026-10-03');
    expect(next).toMatchObject({ label: '1 mes', date: '2026-10-07', daysLeft: 4 });
    expect(next?.text).toBe('en 4 días llegás a 1 mes');
  });

  it('mañana y hoy', () => {
    expect(nextMilestone(since('2026-09-27'), '2026-10-03')?.text).toBe('mañana llegás a 1 semana');
    expect(milestoneToday(since('2026-09-26'), '2026-10-03')?.label).toBe('1 semana');
    expect(milestoneToday(since('2026-09-25'), '2026-10-03')).toBeNull();
  });

  it('el día del hito, el próximo es el siguiente', () => {
    expect(nextMilestone(since('2026-09-26'), '2026-10-03')?.label).toBe('2 semanas');
  });

  it('respeta count_start_day', () => {
    // Con el día de inicio como día 1, el día 7 cae un día antes.
    expect(
      milestoneToday(since('2026-09-27', { count_start_day: true }), '2026-10-03')?.label,
    ).toBe('1 semana');
  });

  it('aniversarios', () => {
    expect(nextMilestone(since('2026-01-01'), '2026-10-03')).toMatchObject({
      label: '1 año',
      date: '2027-01-01',
    });
    expect(milestoneToday(since('2024-10-03'), '2026-10-03')?.label).toBe('2 años');
    expect(nextMilestone(since('2024-10-03'), '2026-10-03')?.label).toBe('3 años');
  });

  it('aniversario de un 29 de febrero', () => {
    expect(milestoneToday(since('2024-02-29'), '2025-02-28')?.label).toBe('1 año');
    expect(milestoneToday(since('2024-02-29'), '2028-02-29')?.label).toBe('4 años');
  });

  it('solo aplica a since ya empezados', () => {
    expect(nextMilestone(until('2027-01-01'), '2026-10-03')).toBeNull();
    expect(nextMilestone(since('2026-12-01'), '2026-10-03')).toBeNull();
  });
});

describe('personaje', () => {
  it('etapas por días', () => {
    expect(stageForDays(0)).toBe('semilla');
    expect(stageForDays(6)).toBe('semilla');
    expect(stageForDays(7)).toBe('brote');
    expect(stageForDays(29)).toBe('brote');
    expect(stageForDays(30)).toBe('planta');
    expect(stageForDays(89)).toBe('planta');
    expect(stageForDays(90)).toBe('flor');
    expect(stageForDays(364)).toBe('flor');
    expect(stageForDays(365)).toBe('arbol');
  });

  it('etapa de un since, un until y un período', () => {
    expect(mascotStage(since('2026-09-02'), '2026-10-03')).toBe('planta');
    expect(mascotStage(since('2026-12-01'), '2026-10-03')).toBe('semilla');
    expect(mascotStage(until('2027-01-01'), '2026-10-03')).toBe('brote');
    expect(mascotStage(range('2027-03-01', '2027-06-30'), '2027-06-30')).toBe('arbol');
  });

  it('dormido de 23:00 a 7:00', () => {
    const ev = since('2026-01-01');
    expect(mascotExpression(ev, at('2026-10-03', 23, 0))).toBe('dormido');
    expect(mascotExpression(ev, at('2026-10-03', 6, 59))).toBe('dormido');
    expect(mascotExpression(ev, at('2026-10-03', 7, 0))).toBe('contento');
    expect(mascotExpression(ev, at('2026-10-03', 22, 59))).toBe('contento');
  });

  it('festejando el día del hito y emocionado cuando faltan 3 días o menos', () => {
    expect(mascotExpression(since('2026-09-26'), at('2026-10-03', 12))).toBe('festejando');
    expect(mascotExpression(since('2026-09-29'), at('2026-10-03', 12))).toBe('emocionado'); // faltan 3
    expect(mascotExpression(since('2026-09-30'), at('2026-10-03', 12))).toBe('contento'); // faltan 4
  });

  it('until: emocionado y festejando', () => {
    expect(mascotExpression(until('2026-10-03'), at('2026-10-03', 12))).toBe('festejando');
    expect(mascotExpression(until('2026-10-06'), at('2026-10-03', 12))).toBe('emocionado');
    expect(mascotExpression(until('2026-10-07'), at('2026-10-03', 12))).toBe('contento');
    expect(mascotExpression(until('2026-09-01'), at('2026-10-03', 12))).toBe('contento');
  });
});

describe('nextRefreshDate', () => {
  it('elige medianoche, 7:00 o 23:00, lo que llegue primero', () => {
    expect(nextRefreshDate(at('2026-10-03', 10))).toEqual(at('2026-10-03', 23));
    expect(nextRefreshDate(at('2026-10-03', 23, 30))).toEqual(new Date(2026, 9, 4, 0, 0));
    expect(nextRefreshDate(new Date(2026, 9, 4, 0, 30))).toEqual(new Date(2026, 9, 4, 7, 0));
    expect(nextRefreshDate(at('2026-10-03', 7, 0))).toEqual(at('2026-10-03', 23));
  });

  it('siempre devuelve una fecha futura, también en días con cambio de hora', () => {
    let now = new Date(2026, 0, 1, 0, 0);
    for (let i = 0; i < 365 * 4; i++) {
      const next = nextRefreshDate(now);
      expect(next.getTime()).toBeGreaterThan(now.getTime());
      expect(next.getTime() - now.getTime()).toBeLessThanOrEqual(16 * 60 * 60 * 1000);
      now = new Date(next.getTime() + 60_000);
    }
  });
});

describe('toCounterEvent', () => {
  it('valida kind y display_unit de la base', () => {
    const row = {
      id: 'x',
      kind: 'range',
      start_date: '2026-01-01',
      end_date: '2026-02-01',
      count_start_day: false,
      display_unit: 'weeks',
    };
    expect(toCounterEvent(row)).toMatchObject({ id: 'x', kind: 'range', display_unit: 'weeks' });
    expect(toCounterEvent({ ...row, kind: '??', display_unit: '??' })).toMatchObject({
      kind: 'since',
      display_unit: 'auto',
    });
  });
});
