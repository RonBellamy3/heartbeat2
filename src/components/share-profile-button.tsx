"use client";

import { useState } from "react";

export function ShareProfileButton({ username, displayName }: { username: string; displayName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/u/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} on Heartbeat`, url });
        return;
      } catch {
        // user cancelled the share sheet — fall through to clipboard copy
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={share}
      className="rounded-full border border-border px-4 py-1.5 text-xs font-medium"
    >
      {copied ? "Link copied" : "Share profile"}
    </button>
  );
}
