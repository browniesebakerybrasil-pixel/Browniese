import { cn } from "@/lib/utils";

const TOTAL = 10;

/**
 * Mostra X/10 bolinhas preenchidas representando o progresso de fidelidade
 * do cliente. Quando o cliente atinge 10+ pedidos a faixa fica verde; entre
 * 8 e 9 fica amarela para sinalizar que o mimo está próximo.
 */
export function LoyaltyProgress({
  count,
  giftGiven,
  size = "md",
}: {
  count: number;
  giftGiven?: boolean;
  size?: "sm" | "md";
}) {
  const filled = Math.min(count, TOTAL);
  const status =
    giftGiven && count >= TOTAL
      ? "gift-done"
      : count >= TOTAL
        ? "ready"
        : count >= 8
          ? "almost"
          : "progress";

  const palette = {
    "gift-done":
      "bg-emerald-100 text-emerald-800 border-emerald-300",
    ready: "bg-emerald-100 text-emerald-800 border-emerald-300",
    almost: "bg-amber-100 text-amber-800 border-amber-300",
    progress: "bg-[var(--color-cream-50)] text-[var(--color-slate)] border-[var(--border)]",
  }[status];

  const label =
    status === "gift-done"
      ? "Mimo já entregue"
      : status === "ready"
        ? "Hora do mimo!"
        : status === "almost"
          ? `Faltam ${TOTAL - count} para o mimo`
          : `${count}/${TOTAL} pedidos`;

  const dot = size === "sm" ? "h-2 w-2" : "h-3 w-3";

  return (
    <div className={cn("inline-flex flex-col gap-1 rounded-md border px-2 py-1", palette)}>
      <span className="text-xs">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "rounded-full border",
              dot,
              i < filled
                ? "border-transparent bg-current"
                : "border-current bg-transparent",
            )}
          />
        ))}
      </div>
    </div>
  );
}
