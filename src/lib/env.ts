// Expo solo reemplaza las variables EXPO_PUBLIC_* cuando se leen con esta forma literal.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. Copiá .env.example a .env y completalo.',
  );
}

export const env = { supabaseUrl, supabaseAnonKey } as const;
