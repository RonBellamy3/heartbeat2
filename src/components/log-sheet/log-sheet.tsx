"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLogSheet } from "./context";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { StarRatingInput } from "@/components/star-rating";
import type { AlbumSearchResult } from "@/lib/musicbrainz";

type ResolvedAlbum = {
  id: string;
  title: string;
  artistName: string;
  coverArtUrl: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function LogSheet() {
  const { isOpen, prefillAlbum, isAuthenticated, closeLogSheet } = useLogSheet();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);
  const [results, setResults] = useState<AlbumSearchResult[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");

  const [album, setAlbum] = useState<ResolvedAlbum | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [listenedOn, setListenedOn] = useState(todayIso());
  const [isRelisten, setIsRelisten] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (prefillAlbum) {
      // Sync the externally-provided prefill (e.g. from an album page) into
      // local state when the sheet opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlbum(prefillAlbum);
    }
  }, [isOpen, prefillAlbum]);

  useEffect(() => {
    // Synchronizes local state with the external search API as the
    // debounced query changes.
    if (!isOpen || album) return;
    if (!debouncedQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setDegraded(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetch(`/api/albums/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setResults(data.results ?? []);
        setDegraded(Boolean(data.degraded));
      })
      .catch(() => {
        if (!cancelled) setDegraded(true);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isOpen, album]);

  if (!isOpen) return null;

  function reset() {
    setQuery("");
    setResults([]);
    setDegraded(false);
    setShowManualAdd(false);
    setManualTitle("");
    setManualArtist("");
    setAlbum(null);
    setRating(null);
    setReviewText("");
    setListenedOn(todayIso());
    setIsRelisten(false);
    setContainsSpoilers(false);
    setError(null);
  }

  function handleClose() {
    reset();
    closeLogSheet();
  }

  async function pickResult(result: AlbumSearchResult) {
    setError(null);
    try {
      const res = await fetch("/api/albums/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAlbum(data.album);
    } catch {
      setError("Couldn't load that album. Try again.");
    }
  }

  async function submitManualAlbum() {
    if (!manualTitle.trim() || !manualArtist.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/albums/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: manualTitle, artistName: manualArtist }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAlbum(data.album);
    } catch {
      setError("Couldn't add that album. Try again.");
    }
  }

  async function submitLog() {
    if (!album) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId: album.id,
          rating,
          reviewText: reviewText || null,
          listenedOn,
          isRelisten,
          containsSpoilers,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong");
      }
      const albumId = album.id;
      handleClose();
      router.push(`/album/${albumId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center">
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-elevated md:max-w-md md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            {album ? "Log this album" : "Log an album"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-muted hover:bg-white/5 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted">
              Sign in to log albums you&apos;ve listened to.
            </p>
            <a
              href="/login"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground"
            >
              Sign in
            </a>
          </div>
        ) : !album ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="p-4">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for an album or artist…"
                className="w-full rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {searching && (
                <p className="px-2 py-4 text-center text-xs text-muted">Searching…</p>
              )}
              {!searching && degraded && (
                <p className="px-4 py-3 text-xs text-muted">
                  Live album search is unavailable right now — you can still add
                  this album manually below.
                </p>
              )}
              {!searching &&
                results.map((result) => (
                  <button
                    key={result.musicbrainzId}
                    onClick={() => pickResult(result)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-sunken">
                      {result.coverArtUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.coverArtUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{result.title}</p>
                      <p className="truncate text-xs text-muted">
                        {result.artistName}
                        {result.releaseYear ? ` · ${result.releaseYear}` : ""}
                      </p>
                    </div>
                  </button>
                ))}

              {!searching && query.trim() && (
                <div className="mt-2 border-t border-border px-2 pt-3">
                  {!showManualAdd ? (
                    <button
                      onClick={() => {
                        setShowManualAdd(true);
                        setManualTitle(query);
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      Can&apos;t find it? Add it manually
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Album title"
                        className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                      <input
                        value={manualArtist}
                        onChange={(e) => setManualArtist(e.target.value)}
                        placeholder="Artist"
                        className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                      <button
                        onClick={submitManualAlbum}
                        className="self-start rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground"
                      >
                        Add album
                      </button>
                    </div>
                  )}
                </div>
              )}
              {error && <p className="px-2 pt-2 text-xs text-danger">{error}</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-sunken">
                {album.coverArtUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.coverArtUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{album.title}</p>
                <p className="truncate text-xs text-muted">{album.artistName}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Rating
                </label>
                <StarRatingInput value={rating} onChange={setRating} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Listened on
                </label>
                <input
                  type="date"
                  value={listenedOn}
                  max={todayIso()}
                  onChange={(e) => setListenedOn(e.target.value)}
                  className="rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Review <span className="text-subtle">(optional)</span>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  maxLength={10000}
                  rows={4}
                  placeholder="What did you think?"
                  className="w-full resize-none rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isRelisten}
                  onChange={(e) => setIsRelisten(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                This is a relisten
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={containsSpoilers}
                  onChange={(e) => setContainsSpoilers(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Review contains spoilers
              </label>

              {error && <p className="text-xs text-danger">{error}</p>}

              <div className="flex gap-2 pt-1">
                {!prefillAlbum && (
                  <button
                    onClick={() => setAlbum(null)}
                    className="rounded-full border border-border px-4 py-2 text-sm"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={submitLog}
                  disabled={submitting}
                  className="flex-1 rounded-full bg-accent py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
                >
                  {submitting ? "Posting…" : "Post log"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
