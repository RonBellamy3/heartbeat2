import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMusicVideoLogSchema } from "@/lib/validation/music-video";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

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
  const parsed = createMusicVideoLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const musicVideo = await prisma.musicVideo.findUnique({
    where: { id: parsed.data.musicVideoId },
  });
  if (!musicVideo) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (musicVideo.releaseDate && musicVideo.releaseDate > new Date()) {
    return NextResponse.json(
      { error: "This video hasn't been released yet." },
      { status: 400 }
    );
  }

  const watchedOn = new Date(parsed.data.watchedOn);
  if (Number.isNaN(watchedOn.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (watchedOn > new Date()) {
    return NextResponse.json(
      { error: "Watch date can't be in the future." },
      { status: 400 }
    );
  }

  const log = await prisma.musicVideoLog.create({
    data: {
      userId: session.user.id,
      musicVideoId: musicVideo.id,
      rating: parsed.data.rating ?? null,
      reviewText: parsed.data.reviewText || null,
      watchedOn,
    },
  });

  return NextResponse.json({ log });
}
