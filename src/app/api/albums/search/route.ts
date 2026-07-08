import { NextResponse } from "next/server";
import { searchAlbums } from "@/lib/musicbrainz";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = requestIp(request);
  const { allowed } = rateLimit(
    `search:${ip}`,
    RATE_LIMITS.search.limit,
    RATE_LIMITS.search.windowMs
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many searches. Slow down a bit." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.slice(0, 200) ?? "";
  if (!q.trim()) {
    return NextResponse.json({ results: [], degraded: false });
  }

  const { results, degraded } = await searchAlbums(q);
  return NextResponse.json({ results, degraded });
}
