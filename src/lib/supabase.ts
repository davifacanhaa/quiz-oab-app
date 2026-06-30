import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com a SERVICE ROLE KEY — uso EXCLUSIVO no servidor
 * (route handlers / server actions). Nunca importe isto em código que
 * roda no navegador: a service role ignora as políticas de RLS.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltam variáveis de ambiente: SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY. Veja .env.example.',
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
