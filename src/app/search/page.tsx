"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { AlbumSearchResult, ArtistSearchResult } from "@/lib/musicbrainz";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);

  const [albumResults, setAlbumResults] = useState<AlbumSearchResult[]>([]);
  const [albumDegraded, setAlbumDegraded] = useState(false);
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([]);
  const [artistDegraded, setArtistDegraded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    // This effect synchronizes local state with the external search APIs as
    // the debounced query changes; resetting/loading state here is intended.
    if (!debouncedQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlbumResults([]);
      setArtistResults([]);
      setAlbumDegraded(false);
      setArtistDegraded(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    Promise.all([
      fetch(`/api/artists/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json()),
      fetch(`/api/albums/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json()),
    ])
      .then(([artistData, albumData]) => {
        if (cancelled) return;
        setArtistResults(artistData.results ?? []);
        setArtistDegraded(Boolean(artistData.degraded));
        setAlbumResults(albumData.results ?? []);
        setAlbumDegraded(Boolean(albumData.degraded));
      })
      .catch(() => {
        if (!cancelled) {
          setArtistDegraded(true);
          setAlbumDegraded(true);
        }
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

  async function openArtist(result: ArtistSearchResult) {
    setResolving(result.musicbrainzId);
    try {
      const res = await fetch("/api/artists/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      router.push(`/artist/${data.artist.id}`);
    } finally {
      setResolving(null);
    }
  }

  const hasQuery = debouncedQuery.trim().length > 0;
  const nothingFound =
    !searching && hasQuery && artistResults.length === 0 && albumResults.length === 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">Search</h1>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for an artist or album…"
        className="w-full rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
      />

      <div className="mt-4">
        {searching && <p className="py-6 text-center text-sm text-muted">Searching…</p>}

        {!searching && artistResults.length > 0 && (
          <div className="mb-4">
            <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Artists
            </h2>
            {artistResults.map((result) => (
              <button
                key={result.musicbrainzId}
                onClick={() => openArtist(result)}
                disabled={resolving === result.musicbrainzId}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-white/5 disabled:opacity-60"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-medium">
                  {result.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{result.name}</p>
                  {result.disambiguation && (
                    <p className="truncate text-xs text-muted">{result.disambiguation}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {!searching && albumResults.length > 0 && (
          <div>
            <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Albums
            </h2>
            {albumResults.map((result) => (
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
          </div>
        )}

        {!searching && (albumDegraded || artistDegraded) && (
          <p className="py-4 text-sm text-muted">
            Live search is unavailable right now. Please try again shortly.
          </p>
        )}
        {nothingFound && !albumDegraded && !artistDegraded && (
          <p className="py-6 text-center text-sm text-muted">Nothing found.</p>
        )}
      </div>
    </div>
  );
}
