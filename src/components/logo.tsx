export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Heartbeat"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={28} />
      <span className="font-semibold tracking-tight text-[17px] text-foreground">
        Heartbeat
      </span>
    </span>
  );
}

/** ECG / pulse-line flourish used in loading states and as a subtle brand motif. */
export function PulseFlourish({
  className,
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 300 60"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 30 H90 L105 8 L120 52 L135 30 H165 L180 12 L195 48 L210 30 H300"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "pulse-line" : undefined}
      />
    </svg>
  );
}
