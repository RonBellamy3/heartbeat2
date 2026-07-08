"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRatingDisplay, StarRatingInput } from "@/components/star-rating";

export interface OwnConcertLog {
  id: string;
  rating: number | null;
  reviewText: string | null;
  setlistNotes: string | null;
}

export function OwnConcertLogCard({ log: initial }: { log: OwnConcertLog }) {
  const router = useRouter();
  const [log, setLog] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(initial.rating);
  const [reviewText, setReviewText] = useState(initial.reviewText ?? "");
  const [setlistNotes, setSetlistNotes] = useState(initial.setlistNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/concert-logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          reviewText: reviewText || null,
          setlistNotes: setlistNotes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLog((prev) => ({
        ...prev,
        rating: data.log.rating,
        reviewText: data.log.reviewText,
        setlistNotes: data.log.setlistNotes,
      }));
      setEditing(false);
      router.refresh();
    } catch {
      setError("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this log? This can't be undone.")) return;
    const res = await fetch(`/api/concert-logs/${log.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleted(true);
      router.refresh();
    }
  }

  if (deleted) return null;

  return (
    <article className="border-b border-border px-4 py-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-accent">Your log</span>
        {!editing && (
          <div className="flex gap-3 text-xs text-muted">
            <button onClick={() => setEditing(true)} className="hover:text-foreground">
              Edit
            </button>
            <button onClick={remove} className="hover:text-danger">
              Delete
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <>
          <StarRatingDisplay rating={log.rating} size={13} />
          {log.reviewText && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{log.reviewText}</p>
          )}
          {log.setlistNotes && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted">
              <span className="font-medium text-foreground/80">Setlist: </span>
              {log.setlistNotes}
            </p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          <StarRatingInput value={rating} onChange={setRating} size={24} />
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={3}
            maxLength={10000}
            className="w-full resize-none rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={setlistNotes}
            onChange={(e) => setSetlistNotes(e.target.value)}
            rows={2}
            maxLength={5000}
            placeholder="Setlist notes"
            className="w-full resize-none rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-full border border-border px-4 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
