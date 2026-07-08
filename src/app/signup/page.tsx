"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/logo";

function usernameFromProfilePath(path: string | null): string | null {
  const match = path?.match(/^\/u\/([^/]+)$/);
  return match ? match[1] : null;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const connectUsername = usernameFromProfilePath(next);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, email, password }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (signInRes?.error) {
      router.push("/login");
      return;
    }

    // Arrived here from a shared profile link — connect automatically since
    // that's clearly why they signed up.
    if (connectUsername) {
      await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: connectUsername }),
      }).catch(() => null);
    }

    router.push(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Wordmark height={32} />
        <h1 className="text-xl font-semibold">
          {connectUsername ? `Join to follow @${connectUsername}` : "Create your account"}
        </h1>
        <p className="text-sm text-muted">For the love of music.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          className="rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <input
          required
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
          maxLength={20}
          className="rounded-lg border border-border bg-sunken px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
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
          autoComplete="new-password"
          placeholder="Password (min. 8 characters)"
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-foreground hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
