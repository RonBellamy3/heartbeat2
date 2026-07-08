"use client";

/** Renders external cover art with a graceful fallback if the image 404s — used from Server Components, where inline onError handlers aren't allowed. */
export function CoverImage({ src, className }: { src: string | null; className?: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
