import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper opcional para refresh de sessão Supabase em middleware.
 * Atualmente o projeto delega autenticação ao Clerk e não está usando o auth
 * do Supabase, mas mantemos esta função pronta para o caso de adoção híbrida
 * (ex.: edge functions / RLS baseado em JWT do Supabase).
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Força refresh do token caso esteja expirado.
  await supabase.auth.getUser();

  return response;
}
