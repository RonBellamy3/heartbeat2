"use client";

import { useLogSheet, type PrefillAlbum } from "@/components/log-sheet/context";

export function LogAlbumButton({ album, label = "Log this album" }: { album: PrefillAlbum; label?: string }) {
  const { openLogSheet } = useLogSheet();
  return (
    <button
      onClick={() => openLogSheet(album)}
      className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
    >
      {label}
    </button>
  );
}
