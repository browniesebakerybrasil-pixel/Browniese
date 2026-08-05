import { cn } from "@/lib/utils";

interface LogoProps {
  /** "mark" = só o símbolo · "full" = símbolo + wordmark · "white" = full em fundo escuro */
  variant?: "mark" | "full" | "white";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { mark: 24, text: "text-base" },
  md: { mark: 32, text: "text-xl" },
  lg: { mark: 40, text: "text-2xl" },
} as const;

/**
 * Logo do Brownie-se.
 *
 * O símbolo é uma "pilha de prateleira" (3 barras horizontais com larguras
 * decrescentes) num quadrado de cantos arredondados navy, com um ponto dourado
 * indicando "atualização ao vivo". Inspirado nos marks compactos do Notion e
 * Linear: pequeno o suficiente pra favicon, legível em sidebar.
 */
export function Logo({
  variant = "full",
  size = "md",
  className,
}: LogoProps) {
  const config = SIZES[size];
  const isWhite = variant === "white";

  const fillBg = isWhite ? "#ffffff" : "#0c3c59";
  const fillBars = isWhite ? "#0c3c59" : "#f2e7d5";

  const mark = (
    <svg
      width={config.mark}
      height={config.mark}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill={fillBg} />
      <rect x="10" y="11" width="20" height="3" rx="1.5" fill={fillBars} />
      <rect x="10" y="18.5" width="14" height="3" rx="1.5" fill={fillBars} />
      <rect x="10" y="26" width="17" height="3" rx="1.5" fill={fillBars} />
      <circle cx="32" cy="12.5" r="2.5" fill="#d9a441" />
    </svg>
  );

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center", className)}>{mark}</span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      <span
        className={cn(
          "font-serif leading-none",
          config.text,
          isWhite ? "text-white" : "text-[var(--color-navy)]",
        )}
      >
        Brownie-se
      </span>
    </span>
  );
}
