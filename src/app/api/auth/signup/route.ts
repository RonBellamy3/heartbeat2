import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation/auth";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";
import { generateToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  const ip = requestIp(request);
  const { allowed } = rateLimit(
    `signup:${ip}`,
    RATE_LIMITS.signup.limit,
    RATE_LIMITS.signup.windowMs
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { username, displayName, email, password } = parsed.data;

  const [existingUsername, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (existingUsername) {
    return NextResponse.json({ error: "Username is taken" }, { status: 409 });
  }
  if (existingEmail) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, displayName, email, passwordHash },
  });

  const { raw, hash } = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  await sendVerificationEmail(user.email, `${appUrl}/verify-email/${raw}`);

  return NextResponse.json({ ok: true });
}
