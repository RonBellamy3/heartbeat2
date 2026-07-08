"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resizeImageToDataUrl } from "@/lib/client-image";

interface InitialUser {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

export function ProfileSettingsForm({ initialUser }: { initialUser: InitialUser }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialUser.displayName);
  const [bio, setBio] = useState(initialUser.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(initialUser.bannerUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512, 512);
      setAvatarUrl(dataUrl);
    } catch {
      setError("Couldn't read that image.");
    }
  }

  async function handleBannerPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 1500, 500);
      setBannerUrl(dataUrl);
    } catch {
      setError("Couldn't read that image.");
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio: bio || null, avatarUrl, bannerUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save changes");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Banner</label>
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          className="block h-32 w-full overflow-hidden rounded-lg bg-sunken"
        >
          {bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          )}
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerPick}
          className="hidden"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Profile picture</label>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-sunken text-lg font-semibold"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            displayName[0]?.toUpperCase()
          )}
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarPick}
          className="hidden"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          className="w-full rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">
          Bio <span className="text-subtle">(max 300 characters)</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {saved && <p className="text-xs text-accent">Saved.</p>}

      <button
        onClick={save}
        disabled={saving}
        className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
