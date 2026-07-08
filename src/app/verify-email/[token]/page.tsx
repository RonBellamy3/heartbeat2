"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [status, setStatus] = useState<"pending" | "ok" | "error">("pending");

  useEffect(() => {
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center px-6 py-12 text-center">
      <LogoMark size={48} className="mb-4" />
      {status === "pending" && <p className="text-sm text-muted">Verifying your email…</p>}
      {status === "ok" && (
        <>
          <h1 className="mb-2 text-xl font-semibold">Email verified</h1>
          <p className="mb-4 text-sm text-muted">You&apos;re all set.</p>
          <Link href="/" className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground">
            Go to Heartbeat
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="mb-2 text-xl font-semibold">Link invalid or expired</h1>
          <p className="text-sm text-muted">Please request a new verification email from settings.</p>
        </>
      )}
    </div>
  );
}
