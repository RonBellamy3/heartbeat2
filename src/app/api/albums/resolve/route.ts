import { NextResponse } from "next/server";
import { upsertAlbumFromSearchResult } from "@/lib/musicbrainz";
import { resolveAlbumSchema } from "@/lib/validation/resolve";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

/** Turns a MusicBrainz search result into a local Album row (caching it), returning its id. */
export async function POST(request: Request) {
  const ip = requestIp(request);
  const { allowed } = rateLimit(
    `resolve:${ip}`,
    RATE_LIMITS.search.limit,
    RATE_LIMITS.search.windowMs
  );
  if (!allowed) {
    return NextResponse.json({ error: "Slow down a bit." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resolveAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const album = await upsertAlbumFromSearchResult({
    musicbrainzId: parsed.data.musicbrainzId,
    title: parsed.data.title,
    artistName: parsed.data.artistName,
    artistMbid: parsed.data.artistMbid ?? null,
    releaseYear: parsed.data.releaseYear ?? null,
    releaseDate: parsed.data.releaseDate ?? null,
    coverArtUrl:
      parsed.data.coverArtUrl ??
      `https://coverartarchive.org/release-group/${parsed.data.musicbrainzId}/front-250`,
    genres: parsed.data.genres ?? [],
  });

  return NextResponse.json({ album });
}
