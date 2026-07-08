import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMusicVideoSchema } from "@/lib/validation/music-video";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

/** Finds an existing matching video (same title/artist) or creates a new one — a community-maintained beta catalog. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const ip = requestIp(request);
  const { allowed } = rateLimit(
    `writes:${ip}:${session.user.id}`,
    RATE_LIMITS.writes.limit,
    RATE_LIMITS.writes.windowMs
  );
  if (!allowed) {
    return NextResponse.json({ error: "Slow down a bit." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMusicVideoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let releaseDate: Date | null = null;
  if (parsed.data.releaseDate) {
    releaseDate = new Date(parsed.data.releaseDate);
    if (Number.isNaN(releaseDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (releaseDate > new Date()) {
      return NextResponse.json(
        { error: "This video hasn't been released yet." },
        { status: 400 }
      );
    }
  }

  const existing = await prisma.musicVideo.findFirst({
    where: {
      title: { equals: parsed.data.title, mode: "insensitive" },
      OR: [
        { artistMbid: parsed.data.artistMbid ?? undefined },
        { artistName: { equals: parsed.data.artistName, mode: "insensitive" } },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ musicVideo: existing });
  }

  const musicVideo = await prisma.musicVideo.create({
    data: {
      title: parsed.data.title,
      artistName: parsed.data.artistName,
      artistMbid: parsed.data.artistMbid ?? null,
      artistId: parsed.data.artistId ?? null,
      videoUrl: parsed.data.videoUrl || null,
      releaseDate,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ musicVideo });
}
