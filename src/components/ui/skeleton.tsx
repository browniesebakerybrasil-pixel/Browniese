import { cn } from "@/lib/utils";

/**
 * Bloco animado pulsando — base de todos os skeletons.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--color-cream-50)]",
        className,
      )}
    />
  );
}
