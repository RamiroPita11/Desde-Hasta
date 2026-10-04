import type { Database } from '@/types/database';

import { todayISO, toCounterEvent, type CounterEvent } from './counter';
import { supabase } from './supabase';

type Row = Database['public']['Tables']['events']['Row'];

/** Una fila de `events` con `kind` y `display_unit` ya validados. */
export type AppEvent = Omit<Row, 'kind' | 'display_unit'> & CounterEvent;

/** Lo que edita el formulario. `user_id`, fechas de auditoría e `id` los pone la base. */
export type EventInput = Pick<
  AppEvent,
  | 'title'
  | 'emoji'
  | 'color'
  | 'kind'
  | 'start_date'
  | 'end_date'
  | 'count_start_day'
  | 'display_unit'
  | 'pinned'
>;

export const EVENT_COLORS = [
  '#FF9500',
  '#FF3B30',
  '#FF2D55',
  '#AF52DE',
  '#5856D6',
  '#007AFF',
  '#32ADE6',
  '#34C759',
  '#A2845E',
  '#8E8E93',
] as const;

export const TITLE_MAX = 40;

/** Normaliza lo que viene del formulario para que cumpla los checks de la tabla. */
// Arma el objeto campo por campo: al editar, el formulario recibe la fila entera
// y no hay que mandar `id`, `user_id`, `archived`, etc.
function clean(input: EventInput): EventInput {
  return {
    title: input.title.trim(),
    emoji: input.emoji?.trim() || null,
    color: input.color,
    kind: input.kind,
    start_date: input.start_date,
    end_date: input.kind === 'range' ? input.end_date : null,
    count_start_day: input.kind === 'since' ? input.count_start_day : false,
    display_unit: input.display_unit,
    pinned: input.pinned,
  };
}

function fail(message: string, error: { message: string } | null): never {
  const lower = error?.message.toLowerCase() ?? '';
  if (lower.includes('fetch') || lower.includes('network')) {
    throw new Error('No hay conexión. Revisá internet y probá de nuevo.');
  }
  throw new Error(message);
}

export async function listEvents(archived = false): Promise<AppEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('archived', archived)
    .order('pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) fail('No se pudieron cargar los eventos.', error);
  return data.map(toCounterEvent);
}

export async function getEvent(id: string): Promise<AppEvent | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  if (error) fail('No se pudo cargar el evento.', error);
  return data ? toCounterEvent(data) : null;
}

export async function createEvent(input: EventInput): Promise<void> {
  const { error } = await supabase.from('events').insert(clean(input));
  if (error) fail('No se pudo guardar el evento.', error);
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const { error } = await supabase.from('events').update(clean(input)).eq('id', id);
  if (error) fail('No se pudo guardar el evento.', error);
}

/** Vuelve a empezar un "desde": la fecha de inicio pasa a ser hoy (fecha local del dispositivo). */
export async function resetEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').update({ start_date: todayISO() }).eq('id', id);
  if (error) fail('No se pudo reiniciar el evento.', error);
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from('events').update({ archived }).eq('id', id);
  if (error) fail('No se pudo actualizar el evento.', error);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) fail('No se pudo borrar el evento.', error);
}
