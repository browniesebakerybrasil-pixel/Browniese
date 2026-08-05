import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service role key.
 * Bypassa RLS — usar APENAS no server para:
 *  - Webhooks (Stripe, Clerk) que precisam atualizar dados sem usuário logado
 *  - Operações administrativas internas
 *  - Sincronização Clerk -> organizations
 *
 * NUNCA importar em Client Components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client: variáveis de ambiente ausentes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
