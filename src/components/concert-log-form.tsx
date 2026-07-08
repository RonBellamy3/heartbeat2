"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRatingInput } from "@/components/star-rating";

export interface ConcertArtist {
  id: string;
  name: string;
  musicbrainzId: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ConcertLogForm({
  artist,
  onClose,
}: {
  artist: ConcertArtist;
  onClose: () => void;
}) {
  const router = useRouter();
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState(todayIso());
  const [tourName, setTourName] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [setlistNotes, setSetlistNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!venueName.trim() || !city.trim()) {
      setError("Venue and city are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const concertRes = await fetch("/api/concerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistName: artist.name,
          artistMbid: artist.musicbrainzId,
          artistId: artist.id,
          venueName,
          city,
          eventDate,
          tourName: tourName || null,
        }),
      });
      const concertData = await concertRes.json();
      if (!concertRes.ok) throw new Error(concertData?.error ?? "Couldn't save that show");

      const logRes = await fetch("/api/concert-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concertId: concertData.concert.id,
          rating,
          reviewText: reviewText || null,
          setlistNotes: setlistNotes || null,
        }),
      });
      const logData = await logRes.json();
      if (!logRes.ok) throw new Error(logData?.error ?? "Couldn't post that log");

      onClose();
      router.push(`/concert/${concertData.concert.id}`);
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Log a {artist.name} show</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-white/5 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Venue"
            className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Date <span className="text-subtle">(must have already happened)</span>
            </label>
            <input
              type="date"
              value={eventDate}
              max={todayIso()}
              onChange={(e) => setEventDate(e.target.value)}
              className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <input
            value={tourName}
            onChange={(e) => setTourName(e.target.value)}
            placeholder="Tour name (optional)"
            className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Rating</label>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            maxLength={10000}
            placeholder="How was the show?"
            className="w-full resize-none rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={setlistNotes}
            onChange={(e) => setSetlistNotes(e.target.value)}
            rows={2}
            maxLength={5000}
            placeholder="Setlist notes (optional)"
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
