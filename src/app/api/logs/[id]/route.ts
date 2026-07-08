import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateLogSchema } from "@/lib/validation/album";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

async function getOwnedLog(id: string, userId: string) {
  const log = await prisma.albumLog.findUnique({ where: { id } });
  if (!log || log.deletedAt) return null;
  if (log.userId !== userId) return "forbidden" as const;
  return log;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const existing = await getOwnedLog(id, session.user.id);
  if (existing === null) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }
  if (existing === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const listenedOn = parsed.data.listenedOn
    ? new Date(parsed.data.listenedOn)
    : undefined;
  if (listenedOn && Number.isNaN(listenedOn.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const log = await prisma.albumLog.update({
    where: { id },
    data: {
      rating: parsed.data.rating,
      reviewText: parsed.data.reviewText,
      listenedOn,
      isRelisten: parsed.data.isRelisten,
      containsSpoilers: parsed.data.containsSpoilers,
    },
  });

  return NextResponse.json({ log });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedLog(id, session.user.id);
  if (existing === null) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }
  if (existing === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.albumLog.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
