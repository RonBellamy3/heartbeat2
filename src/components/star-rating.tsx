"use client";

import { useState } from "react";

const STAR_PATH =
  "M12 2.5l2.9 6.2 6.8.7-5.1 4.6 1.5 6.7L12 17l-6.1 3.7 1.5-6.7-5.1-4.6 6.8-.7z";

function Star({ fill }: { fill: number }) {
  const clipId = `star-clip-${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill="none" stroke="var(--color-fg-subtle)" strokeWidth="1.2" />
      <path d={STAR_PATH} fill="var(--color-accent)" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

export function StarRatingDisplay({
  rating,
  size = 16,
  className,
}: {
  rating: number | null | undefined;
  size?: number;
  className?: string;
}) {
  if (rating == null) return null;
  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className ?? ""}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <div key={i} style={{ width: size, height: size }}>
            <Star fill={fill} />
          </div>
        );
      })}
    </div>
  );
}

export function StarRatingInput({
  value,
  onChange,
  size = 32,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  function ratingFromEvent(index: number, e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    return index + (isHalf ? 0.5 : 1);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, display - i));
          return (
            <button
              key={i}
              type="button"
              style={{ width: size, height: size }}
              className="cursor-pointer touch-manipulation"
              onMouseMove={(e) => setHover(ratingFromEvent(i, e))}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                const next = ratingFromEvent(i, e);
                onChange(next === value ? null : next);
              }}
              aria-label={`${i + 1} star`}
            >
              <Star fill={fill} />
            </button>
          );
        })}
      </div>
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
