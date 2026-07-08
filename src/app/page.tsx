import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Wordmark } from "@/components/logo";
import { AlbumLogCard } from "@/components/album-log-card";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <Wordmark height={40} className="mb-6" />
        <p className="mt-2 text-muted">For the love of music.</p>
        <p className="mt-6 text-sm text-muted">
          Log the albums you listen to, rate them, write reviews, and see what
          your friends are spinning.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-accent py-2.5 text-sm font-medium text-accent-foreground"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border py-2.5 text-sm"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const { feed: feedParam } = await searchParams;
  const feed = feedParam === "everyone" || feedParam === "following" ? feedParam : "following";

  const logs = await prisma.albumLog.findMany({
    where:
      feed === "following"
        ? { deletedAt: null, userId: { in: followingIds } }
        : { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
      album: { select: { id: true, title: true, artistName: true, coverArtUrl: true } },
    },
  });

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex gap-4 border-b border-border px-4 pt-6">
        <Link
          href="/?feed=following"
          className={`pb-3 text-sm font-medium ${
            feed === "following"
              ? "border-b-2 border-accent text-foreground"
              : "text-muted"
          }`}
        >
          Following
        </Link>
        <Link
          href="/?feed=everyone"
          className={`pb-3 text-sm font-medium ${
            feed === "everyone" ? "border-b-2 border-accent text-foreground" : "text-muted"
          }`}
        >
          Everyone
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          {feed === "following" && followingIds.length === 0 ? (
            <>
              <p className="text-sm text-muted">
                You&apos;re not following anyone yet. Share your profile link with
                friends, or find people to follow from their profile.
              </p>
              <Link href="/?feed=everyone" className="text-sm text-accent hover:underline">
                See everyone&apos;s activity instead
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">
              Nothing logged yet. Be the first — tap the + button to log an album.
            </p>
          )}
        </div>
      ) : (
        <div>
          {logs.map((log) => (
            <AlbumLogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
