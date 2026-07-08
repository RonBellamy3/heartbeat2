"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo";

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);
    if (!res.ok) {
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <LogoMark size={48} />
        <h1 className="text-xl font-semibold">Set a new password</h1>
      </div>

      {done ? (
        <p className="rounded-lg bg-sunken px-4 py-3 text-center text-sm text-muted">
          Password updated. Redirecting to sign in…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="New password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-full bg-accent py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </div>
  );
}
