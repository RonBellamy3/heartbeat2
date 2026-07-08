import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { rateLimit, requestIp, RATE_LIMITS } from "@/lib/rate-limit";
import { generateToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";

const GENERIC_MESSAGE = {
  ok: true,
  message: "If an account with that email exists, we've sent a reset link.",
};

export async function POST(request: Request) {
  const ip = requestIp(request);
  const { allowed } = rateLimit(
    `forgot:${ip}`,
    RATE_LIMITS.forgotPassword.limit,
    RATE_LIMITS.forgotPassword.windowMs
  );
  if (!allowed) {
    // Still return the generic message so this endpoint never leaks state.
    return NextResponse.json(GENERIC_MESSAGE);
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(GENERIC_MESSAGE);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user && user.passwordHash && !user.deletedAt) {
    const { raw, hash } = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail(user.email, `${appUrl}/reset-password/${raw}`);
  }

  return NextResponse.json(GENERIC_MESSAGE);
}
