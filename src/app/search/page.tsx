"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { AlbumSearchResult } from "@/lib/musicbrainz";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);
  const [results, setResults] = useState<AlbumSearchResult[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    // This effect synchronizes local state with the external search API as
    // the debounced query changes; resetting/loading state here is intended.
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
  }, [debouncedQuery]);

  async function openAlbum(result: AlbumSearchResult) {
    setResolving(result.musicbrainzId);
    try {
      const res = await fetch("/api/albums/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      router.push(`/album/${data.album.id}`);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">Search albums</h1>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for an album or artist…"
        className="w-full rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
      />

      <div className="mt-4">
        {searching && <p className="py-6 text-center text-sm text-muted">Searching…</p>}
        {!searching && degraded && (
          <p className="py-4 text-sm text-muted">
            Live album search is unavailable right now. Please try again shortly.
          </p>
        )}
        {!searching &&
          results.map((result) => (
            <button
              key={result.musicbrainzId}
              onClick={() => openAlbum(result)}
              disabled={resolving === result.musicbrainzId}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-white/5 disabled:opacity-60"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-sunken">
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
        {!searching && !degraded && query.trim() && results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">No albums found.</p>
        )}
      </div>
    </div>
  );
}
