import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createLogSchema } from "@/lib/validation/album";
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
  const parsed = createLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const album = await prisma.album.findUnique({
    where: { id: parsed.data.albumId },
  });
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const listenedOn = new Date(parsed.data.listenedOn);
  if (Number.isNaN(listenedOn.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const log = await prisma.albumLog.create({
    data: {
      userId: session.user.id,
      albumId: album.id,
      rating: parsed.data.rating ?? null,
      reviewText: parsed.data.reviewText || null,
      listenedOn,
      isRelisten: parsed.data.isRelisten ?? false,
      containsSpoilers: parsed.data.containsSpoilers ?? false,
    },
  });

  return NextResponse.json({ log });
}
