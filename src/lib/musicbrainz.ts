import { prisma } from "@/lib/prisma";

const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org";
const MIN_INTERVAL_MS = 1100; // MusicBrainz asks for <= 1 req/sec; pad slightly for safety
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface AlbumSearchResult {
  musicbrainzId: string;
  title: string;
  artistName: string;
  artistMbid: string | null;
  releaseYear: number | null;
  releaseDate: string | null; // ISO date, when MusicBrainz gives a full date
  genres: string[];
  coverArtUrl: string;
}

export interface ArtistSearchResult {
  musicbrainzId: string;
  name: string;
  disambiguation: string | null;
}

// A simple promise-chain queue keeps concurrent callers from all firing at
// once; each request waits for the previous one plus the minimum interval.
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function throttledFetch(url: string): Promise<Response> {
  const run = async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return fetch(url, {
      headers: {
        "User-Agent":
          process.env.MUSICBRAINZ_USER_AGENT ??
          "Heartbeat/0.1 (dev@example.com)",
        Accept: "application/json",
      },
    });
  };

  const result = queue.then(run, run);
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export function coverArtUrlForReleaseGroup(mbid: string) {
  return `${CAA_BASE}/release-group/${mbid}/front-250`;
}

/** Parses MusicBrainz's first-release-date, which may be a year, year-month, or full date. */
function parseReleaseDate(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split("-");
  const year = parts[0];
  const month = parts[1] ?? "01";
  const day = parts[2] ?? "01";
  const iso = `${year}-${month}-${day}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : iso;
}

interface MBArtistCreditEntry {
  name: string;
  artist?: { id: string };
}
interface MBTag {
  name: string;
}
interface MBReleaseGroup {
  id: string;
  title: string;
  "first-release-date"?: string;
  "artist-credit"?: MBArtistCreditEntry[];
  tags?: MBTag[];
}
interface MBArtist {
  id: string;
  name: string;
  disambiguation?: string;
}

async function cachedSearch<T>(
  cacheKey: string,
  fetcher: () => Promise<T[]>
): Promise<{ results: T[]; degraded: boolean }> {
  const cached = await prisma.musicBrainzSearchCache.findUnique({
    where: { query: cacheKey },
  });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return { results: JSON.parse(cached.resultsJson), degraded: false };
  }

  try {
    const results = await fetcher();
    await prisma.musicBrainzSearchCache.upsert({
      where: { query: cacheKey },
      update: { resultsJson: JSON.stringify(results), fetchedAt: new Date() },
      create: {
        query: cacheKey,
        resultsJson: JSON.stringify(results),
        fetchedAt: new Date(),
      },
    });
    return { results, degraded: false };
  } catch {
    if (cached) return { results: JSON.parse(cached.resultsJson), degraded: true };
    return { results: [], degraded: true };
  }
}

/**
 * Search MusicBrainz release-groups (albums). Results are cached in the DB
 * for 24h so repeat searches don't re-hit the API. If MusicBrainz is
 * unreachable, falls back to a stale cache entry if one exists, otherwise
 * returns an empty, "degraded" result so the UI can show a friendly message
 * instead of crashing.
 */
export async function searchAlbums(
  query: string,
  limit = 15
): Promise<{ results: AlbumSearchResult[]; degraded: boolean }> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { results: [], degraded: false };

  return cachedSearch<AlbumSearchResult>(`album:${normalized}`, async () => {
    const mbQuery = encodeURIComponent(`${query} AND primarytype:Album`);
    const url = `${MB_BASE}/release-group/?query=${mbQuery}&fmt=json&limit=${limit}`;
    const res = await throttledFetch(url);
    if (!res.ok) throw new Error(`MusicBrainz responded ${res.status}`);

    const data = (await res.json()) as { "release-groups"?: MBReleaseGroup[] };
    const mapped: AlbumSearchResult[] = (data["release-groups"] ?? []).map((rg) => ({
      musicbrainzId: rg.id,
      title: rg.title,
      artistName: rg["artist-credit"]?.map((c) => c.name).join(", ") ?? "Unknown Artist",
      artistMbid: rg["artist-credit"]?.[0]?.artist?.id ?? null,
      releaseYear: rg["first-release-date"]
        ? parseInt(rg["first-release-date"].slice(0, 4), 10) || null
        : null,
      releaseDate: parseReleaseDate(rg["first-release-date"]),
      genres: (rg.tags ?? []).slice(0, 5).map((t) => t.name),
      coverArtUrl: coverArtUrlForReleaseGroup(rg.id),
    }));

    // MusicBrainz's own relevance score often ties several results at 100,
    // in which case its ordering can put an obscure release ahead of a
    // famous one for the exact same title (e.g. "Abbey Road"). Re-rank so an
    // exact (case-insensitive) title match comes first, since that's almost
    // always what the user meant; leave everything else in MB's order.
    return mapped
      .map((r, index) => ({ r, index }))
      .sort((a, b) => {
        const aExact = a.r.title.toLowerCase() === normalized ? 0 : 1;
        const bExact = b.r.title.toLowerCase() === normalized ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.index - b.index;
      })
      .map(({ r }) => r);
  });
}

/** Search MusicBrainz artists by name. Cached the same way as album search. */
export async function searchArtists(
  query: string,
  limit = 10
): Promise<{ results: ArtistSearchResult[]; degraded: boolean }> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { results: [], degraded: false };

  return cachedSearch<ArtistSearchResult>(`artist:${normalized}`, async () => {
    const mbQuery = encodeURIComponent(query);
    const url = `${MB_BASE}/artist/?query=${mbQuery}&fmt=json&limit=${limit}`;
    const res = await throttledFetch(url);
    if (!res.ok) throw new Error(`MusicBrainz responded ${res.status}`);

    const data = (await res.json()) as { artists?: MBArtist[] };
    return (data.artists ?? []).map((a) => ({
      musicbrainzId: a.id,
      name: a.name,
      disambiguation: a.disambiguation ?? null,
    }));
  });
}

/** Ensures a local Album row exists for a MusicBrainz search result, creating it on first use. */
export async function upsertAlbumFromSearchResult(result: AlbumSearchResult) {
  return prisma.album.upsert({
    where: { musicbrainzId: result.musicbrainzId },
    update: {},
    create: {
      musicbrainzId: result.musicbrainzId,
      title: result.title,
      artistName: result.artistName,
      artistMbid: result.artistMbid,
      releaseYear: result.releaseYear,
      releaseDate: result.releaseDate ? new Date(result.releaseDate) : null,
      coverArtUrl: result.coverArtUrl,
      genres: JSON.stringify(result.genres),
    },
  });
}

/** Ensures a local Artist row exists for a MusicBrainz artist, creating it on first use. */
export async function upsertArtistFromSearchResult(result: ArtistSearchResult) {
  return prisma.artist.upsert({
    where: { musicbrainzId: result.musicbrainzId },
    update: {},
    create: {
      musicbrainzId: result.musicbrainzId,
      name: result.name,
    },
  });
}
