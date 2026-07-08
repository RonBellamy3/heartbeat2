import { NextResponse } from "next/server";
import { resolveArtist } from "@/lib/artists";
import { resolveArtistSchema } from "@/lib/validation/resolve";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

/** Turns a MusicBrainz artist search result into a local Artist row, fetching a Spotify photo. */
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
  const parsed = resolveArtistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const artist = await resolveArtist({
    musicbrainzId: parsed.data.musicbrainzId,
    name: parsed.data.name,
    disambiguation: parsed.data.disambiguation ?? null,
  });
  return NextResponse.json({ artist });
}
