"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Wordmark height={32} />
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted">For the love of music.</p>
      </div>

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
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-full bg-accent py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-xs text-muted">
        <Link href="/forgot-password" className="hover:text-foreground">
          Forgot password?
        </Link>
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="hover:text-foreground"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
