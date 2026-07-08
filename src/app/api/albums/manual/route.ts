import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { manualAlbumSchema } from "@/lib/validation/album";
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
  const parsed = manualAlbumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const album = await prisma.album.create({
    data: {
      title: parsed.data.title,
      artistName: parsed.data.artistName,
      releaseYear: parsed.data.releaseYear ?? null,
      createdById: session.user.id,
      genres: "[]",
    },
  });

  return NextResponse.json({ album });
}
