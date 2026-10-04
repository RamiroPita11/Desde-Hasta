import * as Linking from 'expo-linking';

import type { Database } from '@/types/database';

import { env } from './env';
import { supabase } from './supabase';
import { loadWidgetSource } from './widget-source';

export type WidgetToken = Pick<
  Database['public']['Tables']['widget_tokens']['Row'],
  'id' | 'created_at' | 'last_used_at'
>;

export async function listWidgetTokens(): Promise<WidgetToken[]> {
  const { data, error } = await supabase
    .from('widget_tokens')
    .select('id, created_at, last_used_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error('No se pudieron cargar los widgets.');
  return data;
}

export async function revokeWidgetToken(id: string): Promise<void> {
  const { error } = await supabase.from('widget_tokens').delete().eq('id', id);
  if (error) throw new Error('No se pudo revocar el widget.');
}

/**
 * Crea un token nuevo y devuelve el script completo para pegar en Scriptable.
 * El token en claro solo existe acá: en la base queda su hash.
 */
export async function createWidgetScript(): Promise<string> {
  const source = await loadWidgetSource();
  const { data: token, error } = await supabase.rpc('create_widget_token');
  if (error || !token) throw new Error('No se pudo crear el token del widget.');

  const config = {
    supabaseUrl: env.supabaseUrl,
    anonKey: env.supabaseAnonKey,
    token,
    appUrl: Linking.createURL('/'),
  };
  return [
    '// Desde / Hasta: widget para Scriptable.',
    '// Este script tiene un token personal: no lo compartas. Se revoca desde la app.',
    `const DH_CONFIG = ${JSON.stringify(config, null, 2)};`,
    '',
    source,
  ].join('\n');
}
