"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRatingInput } from "@/components/star-rating";
import { BetaBadge } from "@/components/beta-badge";

export interface VideoArtist {
  id: string;
  name: string;
  musicbrainzId: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MusicVideoLogForm({
  artist,
  onClose,
}: {
  artist: VideoArtist;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [watchedOn, setWatchedOn] = useState(todayIso());
  const [rating, setRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const videoRes = await fetch("/api/music-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artistName: artist.name,
          artistMbid: artist.musicbrainzId,
          artistId: artist.id,
          videoUrl: videoUrl || null,
        }),
      });
      const videoData = await videoRes.json();
      if (!videoRes.ok) throw new Error(videoData?.error ?? "Couldn't save that video");

      const logRes = await fetch("/api/music-video-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicVideoId: videoData.musicVideo.id,
          rating,
          reviewText: reviewText || null,
          watchedOn,
        }),
      });
      const logData = await logRes.json();
      if (!logRes.ok) throw new Error(logData?.error ?? "Couldn't post that log");

      onClose();
      router.push(`/video/${videoData.musicVideo.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-elevated p-4 md:max-w-md md:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Log a {artist.name} music video</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-white/5 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <BetaBadge />
          <p className="text-xs text-muted">
            Music videos are community-added and not yet verified against any catalog.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title"
            className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Link to the video (optional)"
            className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Watched on</label>
            <input
              type="date"
              value={watchedOn}
              max={todayIso()}
              onChange={(e) => setWatchedOn(e.target.value)}
              className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Rating</label>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            maxLength={10000}
            placeholder="What did you think?"
            className="w-full resize-none rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-full bg-accent py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {submitting ? "Posting…" : "Post log"}
          </button>
        </div>
      </div>
    </div>
  );
}
