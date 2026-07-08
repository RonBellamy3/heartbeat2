"use client";

import { useState } from "react";
import { MusicVideoLogForm, type VideoArtist } from "@/components/music-video-log-form";

export function LogVideoButton({ artist }: { artist: VideoArtist }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium"
      >
        Log a video
      </button>
      {open && <MusicVideoLogForm artist={artist} onClose={() => setOpen(false)} />}
    </>
  );
}
