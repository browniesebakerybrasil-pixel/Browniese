import { requireOrganization } from "@/lib/auth/organization";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { organization } = await requireOrganization();

  return (
    // Wrapper com bg navy (marrom escuro) no md+: se por algum motivo a
    // sidebar não esticar até o final (glitch de flexbox no Safari iPad em
    // paginas com muito scroll), o gap fica invisivel porque tem o mesmo
    // tom do sidebar. Mobile mantem fundo claro (drawer flutua sobre).
    <div className="flex min-h-screen flex-col md:flex-row md:bg-[var(--color-navy)]">
      <Sidebar
        plan={organization.plan}
        organizationName={organization.name}
      />
      <div className="flex min-h-screen flex-1 flex-col bg-[var(--background)]">
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
