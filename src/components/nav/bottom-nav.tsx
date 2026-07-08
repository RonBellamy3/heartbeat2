"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogSheet } from "@/components/log-sheet/context";

function NavIcon({ name }: { name: "home" | "search" | "profile" }) {
  const paths: Record<typeof name, string> = {
    home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
    search: "M11 4a7 7 0 104.24 12.6l4.58 4.58 1.42-1.42-4.58-4.58A7 7 0 0011 4z",
    profile: "M12 12a5 5 0 100-10 5 5 0 000 10zM4 22c0-4.4 3.6-8 8-8s8 3.6 8 8",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BottomNav({ username }: { username?: string }) {
  const pathname = usePathname();
  const { openLogSheet } = useLogSheet();

  const profileHref = username ? `/u/${username}` : "/login";
  const items = [
    { href: "/", label: "Home", icon: "home" as const },
    { href: "/search", label: "Search", icon: "search" as const },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-[44px] flex-col items-center gap-0.5 px-3 py-2.5 text-[10px] ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}

      <button
        onClick={() => openLogSheet()}
        aria-label="Log an album"
        className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-light text-accent-foreground shadow-lg shadow-black/30"
      >
        +
      </button>

      <Link
        href={profileHref}
        className={`flex min-w-[44px] flex-col items-center gap-0.5 px-3 py-2.5 text-[10px] ${
          pathname === profileHref ? "text-accent" : "text-muted"
        }`}
      >
        <NavIcon name="profile" />
        Profile
      </Link>
    </nav>
  );
}
