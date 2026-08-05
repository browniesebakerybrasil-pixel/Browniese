import { requireOrganization } from "@/lib/auth/organization";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { organization } = await requireOrganization();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
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
