"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      const res = await fetch("/api/follows", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setFollowing(!next); // revert on failure
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        following
          ? "rounded-full border border-border px-4 py-1.5 text-xs font-medium disabled:opacity-60"
          : "rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-60"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
