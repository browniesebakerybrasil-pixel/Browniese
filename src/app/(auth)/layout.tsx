import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Layout das telas de autenticacao. Centraliza o widget do Clerk e exibe a
 * marca Brownie-se ao lado em desktop.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-[var(--color-navy)] p-10 text-white md:flex">
        <Link href="/" aria-label="Brownie-se — voltar para a página inicial">
          <Logo variant="white" size="lg" />
        </Link>
        <div>
          <p className="font-serif text-3xl leading-tight">
            Pare de adivinhar o preço.
            <br />
            Comece a operar com margem.
          </p>
          <p className="mt-4 max-w-sm text-sm text-white/80">
            Gestão interna de food service: matérias primas, fichas técnicas e
            CMV em tempo real.
          </p>
        </div>
        <p className="text-xs text-white/60">
          (c) {new Date().getFullYear()} Brownie-se
        </p>
      </aside>
      <main className="flex items-center justify-center bg-[var(--background)] p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
