"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/logo";
import { useLogSheet } from "@/components/log-sheet/context";
import type { Session } from "next-auth";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Standard next-themes hydration guard: theme is unknown on the server, so
  // render a placeholder until mounted on the client to avoid a mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8" />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? "☀︎" : "☾"}
    </button>
  );
}

export function TopNav({
  session,
  avatarUrl,
}: {
  session: Session | null;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const { openLogSheet } = useLogSheet();

  const links = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Search" },
  ];

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-background/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/">
          <Wordmark />
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted hover:text-foreground"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => openLogSheet()}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground"
          >
            + Log
          </button>
          {session?.user ? (
            <Link href={`/u/${session.user.username}`}>
              <div className="h-8 w-8 overflow-hidden rounded-full bg-sunken">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={session.user.name ?? "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium">
                    {session.user.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-border px-4 py-1.5 text-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
