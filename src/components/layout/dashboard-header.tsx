import { UserButton } from "@clerk/nextjs";

export function DashboardHeader({ title }: { title?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-4">
      <h1 className="font-serif text-xl text-[var(--color-navy)]">
        {title ?? "Brownie-se"}
      </h1>
      <UserButton />
    </header>
  );
}
