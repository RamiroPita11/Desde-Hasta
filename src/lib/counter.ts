/**
 * Lógica de conteo compartida por la app y el widget de Scriptable.
 *
 * Reglas:
 * - Las fechas son de calendario ('YYYY-MM-DD'), nunca timestamps.
 * - "Hoy" es siempre la fecha local del dispositivo (`todayISO()`).
 * - TypeScript puro: nada de React, del DOM ni de APIs nativas.
 *
 * Internamente cada fecha se convierte a un Date a las 12:00 hora local. Así ningún
 * cambio de horario de verano (que ocurre de noche) puede mover el día.
 */
import { addDays, addMonths, differenceInCalendarDays, format } from 'date-fns';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ISODate = string;
export type EventKind = 'since' | 'until' | 'range';
export type DisplayUnit = 'auto' | 'days' | 'weeks' | 'months' | 'years';

export const EVENT_KINDS: readonly EventKind[] = ['since', 'until', 'range'];
export const DISPLAY_UNITS: readonly DisplayUnit[] = ['auto', 'days', 'weeks', 'months', 'years'];

/** Lo mínimo que necesita el contador. Una fila de `events` lo cumple tras `toCounterEvent`. */
export interface CounterEvent {
  kind: EventKind;
  start_date: ISODate;
  end_date: ISODate | null;
  count_start_day: boolean;
  display_unit: DisplayUnit;
}

export interface Quantity {
  value: number;
  /** Unidad ya en singular/plural ("día", "meses"). Vacía para "día N de M". */
  unit: string;
}

export type CounterStatus =
  /** since/range que todavía no empezó */
  | 'upcoming'
  /** since en curso */
  | 'counting'
  /** until que todavía no llegó */
  | 'remaining'
  /** until que es hoy */
  | 'today'
  /** until que ya pasó */
  | 'past'
  /** range en curso */
  | 'active'
  /** range terminado */
  | 'ended';

export interface CounterView {
  status: CounterStatus;
  /** Días totales relevantes para el estado (siempre >= 0). */
  days: number;
  /** Texto chico antes del número: "faltan", "hace", "empieza en", "día"… */
  prefix: string | null;
  /** El número grande, con unidades. Vacío solo cuando el texto es "¡Hoy!". */
  parts: Quantity[];
  /** Texto chico después del número: "de 122". */
  suffix: string | null;
  /** Frase completa: "faltan 163 días", "día 45 de 122", "1 año, 2 meses". */
  text: string;
  /** Subtítulo: total de días si se combinaron unidades, porcentaje en períodos… */
  detail: string | null;
  /** 0..1 en períodos en curso (y 0 / 1 antes / después). Null en since/until. */
  progress: number | null;
  /** Solo en períodos en curso. */
  range: { day: number; length: number } | null;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' → Date a las 12:00 hora local. Lanza RangeError si la fecha no existe. */
export function parseISODate(value: ISODate): Date {
  const match = ISO_RE.exec(value);
  if (!match) throw new RangeError(`Fecha inválida: "${value}"`);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(2000, 0, 1, 12, 0, 0, 0);
  date.setFullYear(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    throw new RangeError(`Fecha inválida: "${value}"`);
  }
  return date;
}

export function isISODate(value: string): boolean {
  try {
    parseISODate(value);
    return true;
  } catch {
    return false;
  }
}

/** Date → 'YYYY-MM-DD' según la zona horaria local. */
export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/** La fecha local de hoy en el dispositivo. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

export function addDaysISO(date: ISODate, amount: number): ISODate {
  return toISODate(addDays(parseISODate(date), amount));
}

/** Días de calendario de `from` a `to` (positivo si `to` es posterior). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISODate(to), parseISODate(from));
}

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/** "3 oct 2026" (o "3 oct" sin año). */
export function formatShortDate(date: ISODate, withYear = true): string {
  const d = parseISODate(date);
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}

/** "desde el 3 oct 2026", "el 15 mar 2027", "del 1 mar al 30 jun 2027". */
export function describeDates(event: CounterEvent): string {
  switch (event.kind) {
    case 'since':
      return `desde el ${formatShortDate(event.start_date)}`;
    case 'until':
      return `el ${formatShortDate(event.start_date)}`;
    case 'range': {
      const end = event.end_date ?? event.start_date;
      const sameYear = end.slice(0, 4) === event.start_date.slice(0, 4);
      return `del ${formatShortDate(event.start_date, !sameYear)} al ${formatShortDate(end)}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Textos en español
// ---------------------------------------------------------------------------

type UnitKey = 'day' | 'week' | 'month' | 'year';

const UNIT_NAMES: Record<UnitKey, readonly [singular: string, plural: string]> = {
  day: ['día', 'días'],
  week: ['semana', 'semanas'],
  month: ['mes', 'meses'],
  year: ['año', 'años'],
};

export function plural(count: number, singular: string, pluralForm: string): string {
  return Math.abs(count) === 1 ? singular : pluralForm;
}

/** Separador de miles con punto a partir de 10 000 (norma RAE: "4464", "12.345"). */
export function formatNumber(n: number): string {
  const abs = Math.abs(Math.trunc(n));
  const digits = String(abs);
  const grouped = abs >= 10000 ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : digits;
  return n < 0 ? `-${grouped}` : grouped;
}

function quantity(value: number, unit: UnitKey): Quantity {
  const [singular, pluralForm] = UNIT_NAMES[unit];
  return { value, unit: plural(value, singular, pluralForm) };
}

/** "31 días", "1 año, 2 meses". */
export function formatQuantities(parts: readonly Quantity[]): string {
  return parts
    .map((p) => (p.unit ? `${formatNumber(p.value)} ${p.unit}` : formatNumber(p.value)))
    .join(', ');
}

export function formatDays(days: number): string {
  return formatQuantities([quantity(days, 'day')]);
}

// ---------------------------------------------------------------------------
// Intervalos y unidades
// ---------------------------------------------------------------------------

export interface CalendarSpan {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

/**
 * Descompone [from, to] en años, meses y días de calendario (from <= to).
 * Los meses se suman desde `from` con `addMonths`, que ajusta al último día del mes:
 * 31 ene → 28 feb es 1 mes y 29 feb 2024 → 28 feb 2025 es 1 año.
 */
export function calendarSpan(from: ISODate, to: ISODate): CalendarSpan {
  const a = parseISODate(from);
  const b = parseISODate(to);
  const totalDays = differenceInCalendarDays(b, a);
  if (totalDays < 0) throw new RangeError('calendarSpan: "from" debe ser anterior a "to"');

  let totalMonths = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (differenceInCalendarDays(b, addMonths(a, totalMonths)) < 0) totalMonths -= 1;
  const anchor = addMonths(a, totalMonths);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: differenceInCalendarDays(b, anchor),
    totalDays,
  };
}

/** Hasta este número de días, el modo 'auto' muestra solo días. */
export const AUTO_DAYS_LIMIT = 60;

function dropZeros(parts: Quantity[]): Quantity[] {
  const nonZero = parts.filter((p) => p.value !== 0);
  return nonZero.length > 0 ? nonZero : parts.slice(0, 1);
}

/** Convierte el intervalo [from, to] en las cantidades a mostrar según la unidad elegida. */
export function quantitiesFor(from: ISODate, to: ISODate, unit: DisplayUnit): Quantity[] {
  const span = calendarSpan(from, to);
  const total = span.totalDays;

  switch (unit) {
    case 'days':
      return [quantity(total, 'day')];
    case 'weeks':
      return dropZeros([quantity(Math.floor(total / 7), 'week'), quantity(total % 7, 'day')]);
    case 'months':
      return dropZeros([
        quantity(span.years * 12 + span.months, 'month'),
        quantity(span.days, 'day'),
      ]);
    case 'years':
      return dropZeros([quantity(span.years, 'year'), quantity(span.months, 'month')]);
    case 'auto': {
      if (total <= AUTO_DAYS_LIMIT) return [quantity(total, 'day')];
      const all = dropZeros([
        quantity(span.years, 'year'),
        quantity(span.months, 'month'),
        quantity(span.days, 'day'),
      ]);
      return all.slice(0, 2);
    }
  }
}

function isOnlyDays(parts: readonly Quantity[]): boolean {
  return parts.length === 1 && (parts[0].unit === 'día' || parts[0].unit === 'días');
}

/** Si el número se mostró en otras unidades, el subtítulo lleva el total de días. */
function totalDetail(parts: readonly Quantity[], totalDays: number): string | null {
  return isOnlyDays(parts) ? null : formatDays(totalDays);
}

// ---------------------------------------------------------------------------
// Vista del contador
// ---------------------------------------------------------------------------

/** Día N (con N >= 1) en que el since con `count_start_day` cuenta el inicio como día 1. */
function sinceOffset(event: CounterEvent): number {
  return event.count_start_day ? 1 : 0;
}

/** Días transcurridos de un since que ya empezó, respetando `count_start_day`. */
export function sinceCount(event: CounterEvent, today: ISODate): number {
  return daysBetween(event.start_date, today) + sinceOffset(event);
}

function upcomingView(today: ISODate, start: ISODate, unit: DisplayUnit): CounterView {
  const parts = quantitiesFor(today, start, unit);
  const days = daysBetween(today, start);
  return {
    status: 'upcoming',
    days,
    prefix: 'empieza en',
    parts,
    suffix: null,
    text: `empieza en ${formatQuantities(parts)}`,
    detail: totalDetail(parts, days),
    progress: null,
    range: null,
  };
}

function sinceView(event: CounterEvent, today: ISODate): CounterView {
  if (daysBetween(today, event.start_date) > 0) {
    return upcomingView(today, event.start_date, event.display_unit);
  }
  const to = addDaysISO(today, sinceOffset(event));
  const parts = quantitiesFor(event.start_date, to, event.display_unit);
  const days = daysBetween(event.start_date, to);
  return {
    status: 'counting',
    days,
    prefix: null,
    parts,
    suffix: null,
    text: formatQuantities(parts),
    detail: days === 0 ? 'Empieza hoy' : totalDetail(parts, days),
    progress: null,
    range: null,
  };
}

function untilView(event: CounterEvent, today: ISODate): CounterView {
  const target = event.start_date;
  const diff = daysBetween(today, target);

  if (diff === 0) {
    return {
      status: 'today',
      days: 0,
      prefix: null,
      parts: [],
      suffix: null,
      text: '¡Hoy!',
      detail: null,
      progress: null,
      range: null,
    };
  }

  if (diff > 0) {
    const parts = quantitiesFor(today, target, event.display_unit);
    const singular = parts.length === 1 && parts[0].value === 1;
    const prefix = singular ? 'falta' : 'faltan';
    return {
      status: 'remaining',
      days: diff,
      prefix,
      parts,
      suffix: null,
      text: `${prefix} ${formatQuantities(parts)}`,
      detail: totalDetail(parts, diff),
      progress: null,
      range: null,
    };
  }

  const parts = quantitiesFor(target, today, event.display_unit);
  return {
    status: 'past',
    days: -diff,
    prefix: 'hace',
    parts,
    suffix: null,
    text: `hace ${formatQuantities(parts)}`,
    detail: totalDetail(parts, -diff),
    progress: null,
    range: null,
  };
}

/**
 * Los períodos siempre cuentan el día de inicio como "día 1" (del 1 al 30 de junio son 30 días),
 * por eso `count_start_day` no aplica a 'range'.
 */
function rangeView(event: CounterEvent, today: ISODate): CounterView {
  const start = event.start_date;
  const end = event.end_date ?? start;
  const length = daysBetween(start, end) + 1;

  if (daysBetween(today, start) > 0) {
    return { ...upcomingView(today, start, event.display_unit), progress: 0 };
  }

  const sinceEnd = daysBetween(end, today);
  if (sinceEnd > 0) {
    const parts = quantitiesFor(end, today, event.display_unit);
    return {
      status: 'ended',
      days: sinceEnd,
      prefix: 'terminó hace',
      parts,
      suffix: null,
      text: `terminó hace ${formatQuantities(parts)}`,
      detail: totalDetail(parts, sinceEnd),
      progress: 1,
      range: null,
    };
  }

  const day = daysBetween(start, today) + 1;
  const progress = day / length;
  return {
    status: 'active',
    days: day,
    prefix: 'día',
    parts: [{ value: day, unit: '' }],
    suffix: `de ${formatNumber(length)}`,
    text: `día ${formatNumber(day)} de ${formatNumber(length)}`,
    detail: `${Math.round(progress * 100)} %`,
    progress,
    range: { day, length },
  };
}

/** Calcula qué mostrar para un evento en la fecha `today` (por defecto, hoy en el dispositivo). */
export function computeCounter(event: CounterEvent, today: ISODate = todayISO()): CounterView {
  switch (event.kind) {
    case 'since':
      return sinceView(event, today);
    case 'until':
      return untilView(event, today);
    case 'range':
      return rangeView(event, today);
  }
}

// ---------------------------------------------------------------------------
// Hitos
// ---------------------------------------------------------------------------

export interface Milestone {
  /** "1 mes", "2 años" */
  label: string;
  /** Fecha en que se cumple. */
  date: ISODate;
  /** Días que faltan desde `today` (0 = hoy). */
  daysLeft: number;
  /** "en 4 días llegás a 1 mes", "mañana llegás a 1 año", "¡Hoy llegás a 1 semana!" */
  text: string;
}

/** Hitos por cantidad de días. El año se celebra por aniversario de calendario (ver abajo). */
export const DAY_MILESTONES: readonly { days: number; label: string }[] = [
  { days: 7, label: '1 semana' },
  { days: 14, label: '2 semanas' },
  { days: 30, label: '1 mes' },
  { days: 60, label: '2 meses' },
  { days: 90, label: '3 meses' },
  { days: 180, label: '6 meses' },
];

function milestoneText(label: string, daysLeft: number): string {
  if (daysLeft === 0) return `¡Hoy llegás a ${label}!`;
  if (daysLeft === 1) return `mañana llegás a ${label}`;
  return `en ${formatDays(daysLeft)} llegás a ${label}`;
}

/**
 * Hitos de un since, en orden. Los de días respetan `count_start_day` (el "día 7" es el día
 * en que el contador marca 7). Los años son aniversarios de calendario: el 3 oct de cada año,
 * y el 29 feb se celebra el 28 feb en los años no bisiestos.
 */
function milestoneDates(event: CounterEvent, upTo: ISODate): { label: string; date: ISODate }[] {
  const offset = sinceOffset(event);
  const list = DAY_MILESTONES.map((m) => ({
    label: m.label,
    date: addDaysISO(event.start_date, m.days - offset),
  }));

  const start = parseISODate(event.start_date);
  const yearsNeeded = Math.max(1, calendarSpan(event.start_date, upTo).years + 1);
  for (let year = 1; year <= yearsNeeded; year++) {
    list.push({
      label: `${year} ${plural(year, 'año', 'años')}`,
      date: toISODate(addMonths(start, year * 12)),
    });
  }

  return list.sort((a, b) => daysBetween(b.date, a.date));
}

function milestonesApply(event: CounterEvent, today: ISODate): boolean {
  return event.kind === 'since' && daysBetween(event.start_date, today) >= 0;
}

/** El hito que se cumple exactamente hoy, si hay uno. */
export function milestoneToday(event: CounterEvent, today: ISODate = todayISO()): Milestone | null {
  if (!milestonesApply(event, today)) return null;
  const hit = milestoneDates(event, today).find((m) => m.date === today);
  return hit ? { ...hit, daysLeft: 0, text: milestoneText(hit.label, 0) } : null;
}

/** El próximo hito estrictamente después de hoy. Solo para eventos 'since' ya empezados. */
export function nextMilestone(event: CounterEvent, today: ISODate = todayISO()): Milestone | null {
  if (!milestonesApply(event, today)) return null;
  const nextYear = addDaysISO(today, 366);
  const next = milestoneDates(event, nextYear).find((m) => daysBetween(today, m.date) > 0);
  if (!next) return null;
  const daysLeft = daysBetween(today, next.date);
  return { ...next, daysLeft, text: milestoneText(next.label, daysLeft) };
}

// ---------------------------------------------------------------------------
// Personaje
// ---------------------------------------------------------------------------

export type MascotStage = 'semilla' | 'brote' | 'planta' | 'flor' | 'arbol';
export type MascotExpression = 'contento' | 'emocionado' | 'festejando' | 'dormido';

export const MASCOT_STAGES: readonly MascotStage[] = [
  'semilla',
  'brote',
  'planta',
  'flor',
  'arbol',
];
export const MASCOT_EXPRESSIONS: readonly MascotExpression[] = [
  'contento',
  'emocionado',
  'festejando',
  'dormido',
];

/** Días mínimos de cada etapa para eventos 'since'. */
const STAGE_THRESHOLDS: readonly [minDays: number, stage: MascotStage][] = [
  [365, 'arbol'],
  [90, 'flor'],
  [30, 'planta'],
  [7, 'brote'],
  [0, 'semilla'],
];

export function stageForDays(days: number): MascotStage {
  for (const [min, stage] of STAGE_THRESHOLDS) {
    if (days >= min) return stage;
  }
  return 'semilla';
}

/**
 * Etapa de la plantita.
 * - since: por días transcurridos (semilla 0-6, brote 7-29, planta 30-89, flor 90-364, árbol 365+).
 * - range: crece con el porcentaje del período (semilla al empezar, árbol al terminar).
 * - until: siempre brote (está "esperando").
 */
export function mascotStage(event: CounterEvent, today: ISODate = todayISO()): MascotStage {
  const view = computeCounter(event, today);
  switch (event.kind) {
    case 'since':
      return view.status === 'counting' ? stageForDays(sinceCount(event, today)) : 'semilla';
    case 'until':
      return 'brote';
    case 'range': {
      const index = Math.min(4, Math.floor((view.progress ?? 0) * 5));
      return MASCOT_STAGES[index];
    }
  }
}

export const SLEEP_HOUR = 23;
export const WAKE_HOUR = 7;
/** Días antes de un hito o de un 'until' en que la plantita se emociona. */
export const EXCITED_DAYS = 3;

export function isSleepTime(now: Date): boolean {
  const hour = now.getHours();
  return hour >= SLEEP_HOUR || hour < WAKE_HOUR;
}

/** Expresión según la hora local y el estado del evento. Dormido gana sobre todo lo demás. */
export function mascotExpression(event: CounterEvent, now: Date = new Date()): MascotExpression {
  if (isSleepTime(now)) return 'dormido';
  const today = todayISO(now);

  if (event.kind === 'until') {
    const left = daysBetween(today, event.start_date);
    if (left === 0) return 'festejando';
    if (left > 0 && left <= EXCITED_DAYS) return 'emocionado';
    return 'contento';
  }

  if (milestoneToday(event, today)) return 'festejando';
  const next = nextMilestone(event, today);
  if (next && next.daysLeft <= EXCITED_DAYS) return 'emocionado';
  return 'contento';
}

/** Ruta relativa a la raíz de la PWA: "mascot/brote-contento.png". */
export function mascotImagePath(stage: MascotStage, expression: MascotExpression): string {
  return `mascot/${stage}-${expression}.png`;
}

/**
 * Próximo momento en que puede cambiar lo que se muestra: la medianoche local o las
 * 7:00 / 23:00 (cambio de expresión), lo que llegue primero. Lo usa el widget.
 */
export function nextRefreshDate(now: Date = new Date()): Date {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const candidates = [
    new Date(y, m, d, WAKE_HOUR, 0, 0, 0),
    new Date(y, m, d, SLEEP_HOUR, 0, 0, 0),
    new Date(y, m, d + 1, 0, 0, 0, 0),
  ].filter((c) => c.getTime() > now.getTime());
  return candidates.reduce((min, c) => (c.getTime() < min.getTime() ? c : min));
}

// ---------------------------------------------------------------------------
// Validación de filas que vienen de Supabase
// ---------------------------------------------------------------------------

export function isEventKind(value: string): value is EventKind {
  return (EVENT_KINDS as readonly string[]).includes(value);
}

export function isDisplayUnit(value: string): value is DisplayUnit {
  return (DISPLAY_UNITS as readonly string[]).includes(value);
}

interface RawEventFields {
  kind: string;
  start_date: string;
  end_date: string | null;
  count_start_day: boolean;
  display_unit: string;
}

/** Convierte una fila de la base (con `kind` y `display_unit` como string) en un CounterEvent. */
export function toCounterEvent<T extends RawEventFields>(
  row: T,
): Omit<T, 'kind' | 'display_unit'> & CounterEvent {
  const kind: EventKind = isEventKind(row.kind) ? row.kind : 'since';
  const display_unit: DisplayUnit = isDisplayUnit(row.display_unit) ? row.display_unit : 'auto';
  return { ...row, kind, display_unit };
}
