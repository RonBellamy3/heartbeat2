import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createConcertSchema } from "@/lib/validation/concert";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

/** Finds an existing matching concert (same artist/venue/city/date) or creates a new one. Past shows only. */
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
  const parsed = createConcertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const eventDate = new Date(parsed.data.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (eventDate > new Date()) {
    return NextResponse.json(
      { error: "Only shows that have already happened can be logged." },
      { status: 400 }
    );
  }

  const dayStart = new Date(eventDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const existing = await prisma.concert.findFirst({
    where: {
      venueName: { equals: parsed.data.venueName, mode: "insensitive" },
      city: { equals: parsed.data.city, mode: "insensitive" },
      eventDate: { gte: dayStart, lt: dayEnd },
      OR: [
        { artistMbid: parsed.data.artistMbid ?? undefined },
        { artistName: { equals: parsed.data.artistName, mode: "insensitive" } },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ concert: existing });
  }

  const concert = await prisma.concert.create({
    data: {
      artistName: parsed.data.artistName,
      artistMbid: parsed.data.artistMbid ?? null,
      artistId: parsed.data.artistId ?? null,
      venueName: parsed.data.venueName,
      city: parsed.data.city,
      eventDate,
      tourName: parsed.data.tourName || null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ concert });
}
