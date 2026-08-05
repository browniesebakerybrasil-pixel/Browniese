"use server";

/**
 * Rota de onboarding removida. Deixamos apenas um no-op para nao quebrar
 * imports antigos que ainda possam existir. Next 16 permite exportar funcoes
 * async de arquivos "use server" — este stub cumpre a regra.
 */
export async function completeOnboarding(): Promise<{ ok: true }> {
  return { ok: true };
}
