import { requireOrganization } from "@/lib/auth/organization";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { organization } = await requireOrganization();

  return (
    // Wrapper com fundo marrom (cor da sidebar) SEMPRE, pra garantir que
    // qualquer gap entre sidebar e conteúdo (glitch de flexbox no Safari
    // iPad em paginas longas) fique invisivel. Mobile ainda funciona porque
    // o drawer usa position:fixed e overlaysobre o conteúdo.
    <div
      className="flex min-h-screen flex-col md:flex-row"
      style={{ backgroundColor: "var(--color-navy)" }}
    >
      <Sidebar
        plan={organization.plan}
        organizationName={organization.name}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--background)]">
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
