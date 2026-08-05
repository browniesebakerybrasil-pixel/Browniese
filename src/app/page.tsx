import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/brand/logo";
import {
  IllustrationLiveRecipe,
  IllustrationPricing,
  IllustrationChannels,
} from "@/components/brand/illustrations";

const features = [
  {
    title: "Ficha técnica viva",
    body: "Atualize uma matéria prima e veja o CMV de todas as fichas se ajustarem em cascata.",
    Illustration: IllustrationLiveRecipe,
  },
  {
    title: "Precificação correta",
    body: "Markup, margem desejada e preço mínimo calculados na hora — sem planilha.",
    Illustration: IllustrationPricing,
  },
  {
    title: "Resultado por canal",
    body: "Balcão, WhatsApp, iFood, 99Food, Rappi: veja o líquido depois das taxas.",
    Illustration: IllustrationChannels,
  },
];

const plans = [
  { name: "Básico", price: "R$ 97", note: "até 50 fichas, 2 usuários" },
  { name: "Full", price: "R$ 147", note: "fichas ilimitadas, exportações" },
  { name: "Master", price: "R$ 247", note: "financeiro + multi-unidades" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 md:px-10">
        <Logo size="md" />
        <nav className="flex items-center gap-3 text-sm">
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-2 text-[var(--color-navy)] hover:bg-[var(--color-cream)]"
            >
              Entrar
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-[var(--color-brown)] px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brown-600)]"
            >
              Começar grátis
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-md bg-[var(--color-navy)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-navy-600)]"
            >
              Ir para o dashboard
            </Link>
            <UserButton />
          </Show>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-16 md:px-10 md:py-28">
          {/* Backdrop sutil — círculos cream gradiente, decorativos */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[var(--color-cream)] opacity-40 blur-3xl" />
            <div className="absolute -left-40 top-40 h-[400px] w-[400px] rounded-full bg-[var(--color-gold)] opacity-10 blur-3xl" />
          </div>

          <div className="mx-auto max-w-4xl">
            <p
              className="fade-in-up mb-4 text-sm uppercase tracking-widest text-[var(--color-brown)]"
              style={{ ["--delay" as string]: "0ms" }}
            >
              gestão interna que faz sentido
            </p>

            {/* Título com máscara reveal + gradiente animado.
                A máscara fica num span externo (clip-path) e o gradiente num
                span interno (background-clip: text) — separar evita conflito
                entre as duas operações de clipping em alguns navegadores. */}
            <h1 className="font-serif text-4xl leading-tight md:text-6xl">
              <span
                className="reveal-mask"
                style={{ ["--delay" as string]: "120ms" }}
              >
                <span className="gradient-text">
                  Pare de adivinhar o preço.
                </span>
              </span>
              <br />
              <span
                className="reveal-mask text-[var(--color-navy)]"
                style={{ ["--delay" as string]: "520ms" }}
              >
                Comece a operar com margem.
              </span>
            </h1>

            <p
              className="fade-in-up mt-6 max-w-2xl text-lg text-[var(--color-slate)]"
              style={{ ["--delay" as string]: "1100ms" }}
            >
              O Brownie-se cuida das matérias primas, insumos, fichas técnicas e
              pedidos do seu food service — e mostra, em tempo real, quanto
              cada item está custando e rendendo.
            </p>

            <div
              className="fade-in-up mt-8 flex flex-wrap gap-3"
              style={{ ["--delay" as string]: "1300ms" }}
            >
              <Link
                href="/sign-up"
                className="rounded-md bg-[var(--color-brown)] px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-brown-600)]"
              >
                Criar minha conta
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border border-[var(--color-navy)] px-6 py-3 font-medium text-[var(--color-navy)] transition-colors hover:bg-[var(--color-cream)]"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Tags de confiança / categorias atendidas */}
            <div
              className="fade-in-up mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[var(--color-slate)]"
              style={{ ["--delay" as string]: "1500ms" }}
            >
              <span className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="pulse-soft absolute inset-0 rounded-full bg-emerald-500" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Atualizações em tempo real
              </span>
              <span>· Hamburguerias</span>
              <span>· Confeitarias</span>
              <span>· Restaurantes</span>
              <span>· Delivery</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-[var(--border)] bg-[var(--color-cream-50)] px-6 py-20 md:px-10">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm uppercase tracking-widest text-[var(--color-brown)]">
              o que o brownie-se faz
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[var(--color-navy)] md:text-4xl">
              O catálogo, o cálculo e o resultado — em um só lugar.
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {features.map(({ title, body, Illustration }, i) => (
                <article
                  key={title}
                  className="fade-in-up group rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  style={{ ["--delay" as string]: `${i * 120}ms` }}
                >
                  <div className="mb-4 overflow-hidden rounded-lg bg-[var(--color-cream-50)]">
                    <Illustration className="h-44 w-full" />
                  </div>
                  <h3 className="font-serif text-xl text-[var(--color-navy)]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-slate)]">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Planos */}
        <section className="px-6 py-20 md:px-10">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm uppercase tracking-widest text-[var(--color-brown)]">
              planos
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[var(--color-navy)] md:text-4xl">
              Comece pelo Básico, cresça quando fizer sentido.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {plans.map((p, i) => (
                <article
                  key={p.name}
                  className="fade-in-up rounded-xl border border-[var(--border)] bg-white p-6 transition-all hover:border-[var(--color-brown)]"
                  style={{ ["--delay" as string]: `${i * 100}ms` }}
                >
                  <p className="text-sm uppercase tracking-widest text-[var(--color-brown)]">
                    {p.name}
                  </p>
                  <p className="mt-3 font-serif text-3xl text-[var(--color-navy)]">
                    {p.price}
                    <span className="text-base text-[var(--color-slate)]">
                      {" "}
                      / mês
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-slate)]">
                    {p.note}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-[var(--border)] bg-[var(--color-navy)] px-6 py-16 text-white md:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-2xl md:text-3xl">
                Pronto para parar de adivinhar?
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/70">
                Crie sua conta gratuita e comece a precificar com margem em
                menos de 5 minutos.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="rounded-md bg-[var(--color-gold)] px-6 py-3 font-medium text-[var(--color-navy)] shadow-sm transition-transform hover:scale-[1.02]"
            >
              Criar minha conta
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-6 py-6 text-sm text-[var(--color-slate)] md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} Brownie-se · gestão para food service</p>
        </div>
      </footer>
    </div>
  );
}
