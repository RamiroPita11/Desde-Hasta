import { supabase } from './supabase';

export const OTP_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

/** Manda el código de 6 dígitos al email (crea la cuenta si no existe). */
export async function sendLoginCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(authErrorMessage(error.message, error.status));
}

/** Verifica el código. Si es correcto, Supabase guarda la sesión y avisa a onAuthStateChange. */
export async function verifyLoginCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw new Error(authErrorMessage(error.message, error.status));
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(authErrorMessage(error.message, error.status));
}

function authErrorMessage(message: string, status: number | undefined): string {
  const lower = message.toLowerCase();
  if (status === 429 || lower.includes('rate limit') || lower.includes('security purposes')) {
    return 'Pediste muchos códigos seguidos. Esperá un minuto y probá de nuevo.';
  }
  if (lower.includes('expired') || lower.includes('invalid')) {
    return 'El código no es correcto o ya venció. Pedí uno nuevo.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'No hay conexión. Revisá internet y probá de nuevo.';
  }
  return message;
}
