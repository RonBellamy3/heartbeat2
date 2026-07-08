import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { followSchema } from "@/lib/validation/follow";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const ip = requestIp(request);
  const { allowed } = rateLimit(
    `likes:${ip}:${session.user.id}`,
    RATE_LIMITS.likes.limit,
    RATE_LIMITS.likes.windowMs
  );
  if (!allowed) {
    return NextResponse.json({ error: "Slow down a bit." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!target || target.deletedAt) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });
  }

  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: session.user.id, followingId: target.id },
    },
    update: {},
    create: { followerId: session.user.id, followingId: target.id },
  });

  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.follow
    .delete({
      where: {
        followerId_followingId: { followerId: session.user.id, followingId: target.id },
      },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true, following: false });
}
