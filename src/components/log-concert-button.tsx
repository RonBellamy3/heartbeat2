"use client";

import { useState } from "react";
import { ConcertLogForm, type ConcertArtist } from "@/components/concert-log-form";

export function LogConcertButton({ artist }: { artist: ConcertArtist }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium"
      >
        Log a show
      </button>
      {open && <ConcertLogForm artist={artist} onClose={() => setOpen(false)} />}
    </>
  );
}
