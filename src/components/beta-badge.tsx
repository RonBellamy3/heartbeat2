export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={`rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent ${className ?? ""}`}
    >
      Beta
    </span>
  );
}
