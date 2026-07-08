import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createConcertLogSchema } from "@/lib/validation/concert";
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
  const parsed = createConcertLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const concert = await prisma.concert.findUnique({
    where: { id: parsed.data.concertId },
  });
  if (!concert) {
    return NextResponse.json({ error: "Concert not found" }, { status: 404 });
  }
  if (concert.eventDate > new Date()) {
    return NextResponse.json(
      { error: "You can only log shows that have already happened." },
      { status: 400 }
    );
  }

  const log = await prisma.concertLog.create({
    data: {
      userId: session.user.id,
      concertId: concert.id,
      rating: parsed.data.rating ?? null,
      reviewText: parsed.data.reviewText || null,
      setlistNotes: parsed.data.setlistNotes || null,
    },
  });

  return NextResponse.json({ log });
}
