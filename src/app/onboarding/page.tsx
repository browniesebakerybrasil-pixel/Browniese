import { redirect } from "next/navigation";

/**
 * A tela de onboarding foi removida. A organizacao e criada
 * automaticamente na primeira visita ao dashboard via
 * `requireOrganization()` -> `ensureOrganizationStub()`.
 * Qualquer acesso a esta rota vai direto ao dashboard.
 */
export default function OnboardingRedirect() {
  redirect("/dashboard");
}
