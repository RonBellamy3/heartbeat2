import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validation/profile";
import { isValidImageDataUrl } from "@/lib/image-sniff";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const ip = requestIp(request);
  const { allowed } = rateLimit(
    `uploads:${ip}:${session.user.id}`,
    RATE_LIMITS.uploads.limit,
    RATE_LIMITS.uploads.windowMs
  );
  if (!allowed) {
    return NextResponse.json({ error: "Slow down a bit." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (parsed.data.avatarUrl && !isValidImageDataUrl(parsed.data.avatarUrl)) {
    return NextResponse.json({ error: "Invalid avatar image" }, { status: 400 });
  }
  if (parsed.data.bannerUrl && !isValidImageDataUrl(parsed.data.bannerUrl)) {
    return NextResponse.json({ error: "Invalid banner image" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      avatarUrl: parsed.data.avatarUrl,
      bannerUrl: parsed.data.bannerUrl,
    },
    select: {
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
    },
  });

  return NextResponse.json({ user });
}
