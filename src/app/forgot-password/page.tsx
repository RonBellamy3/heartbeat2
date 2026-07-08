"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);
    setMessage(data?.message ?? "If an account with that email exists, we've sent a reset link.");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <LogoMark size={48} />
        <h1 className="text-xl font-semibold">Reset your password</h1>
      </div>

      {message ? (
        <p className="rounded-lg bg-sunken px-4 py-3 text-center text-sm text-muted">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-full bg-accent py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        <Link href="/login" className="hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
