import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AlbumLogCard } from "@/components/album-log-card";
import { ShareProfileButton } from "@/components/share-profile-button";
import { FollowButton } from "@/components/follow-button";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bannerUrl: true,
      bio: true,
      createdAt: true,
      deletedAt: true,
    },
  });
  if (!user || user.deletedAt) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  const logs = await prisma.albumLog.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      album: { select: { id: true, title: true, artistName: true, coverArtUrl: true } },
    },
  });

  const ratedCount = logs.filter((l) => l.rating != null).length;
  const averageRating =
    ratedCount > 0
      ? logs.reduce((sum, l) => sum + (l.rating ?? 0), 0) / ratedCount
      : null;

  const [followerCount, followingCount, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    session?.user && !isOwnProfile
      ? prisma.follow
          .findUnique({
            where: {
              followerId_followingId: { followerId: session.user.id, followingId: user.id },
            },
          })
          .then((f) => Boolean(f))
      : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="h-32 w-full bg-sunken">
        {user.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="flex items-end justify-between gap-4 px-4">
        <div className="-mt-8 flex items-end gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-sunken text-lg font-semibold">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              user.displayName[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-lg font-semibold">{user.displayName}</h1>
            <p className="text-sm text-muted">@{user.username}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 pb-1">
          {isOwnProfile ? (
            <Link
              href="/settings"
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium"
            >
              Edit profile
            </Link>
          ) : (
            session?.user && (
              <FollowButton username={user.username} initialFollowing={isFollowing} />
            )
          )}
          <ShareProfileButton username={user.username} displayName={user.displayName} />
        </div>
      </div>

      {user.bio && <p className="px-4 pt-3 text-sm text-foreground/90">{user.bio}</p>}

      <div className="flex gap-6 px-4 pt-4 text-sm">
        <div>
          <span className="font-semibold">{logs.length}</span>{" "}
          <span className="text-muted">logged</span>
        </div>
        {averageRating != null && (
          <div>
            <span className="font-semibold">{averageRating.toFixed(1)}</span>{" "}
            <span className="text-muted">avg rating</span>
          </div>
        )}
        <div>
          <span className="font-semibold">{followerCount}</span>{" "}
          <span className="text-muted">followers</span>
        </div>
        <div>
          <span className="font-semibold">{followingCount}</span>{" "}
          <span className="text-muted">following</span>
        </div>
      </div>

      <h2 className="px-4 pb-2 pt-6 text-sm font-semibold text-muted">Logs</h2>
      {logs.length === 0 ? (
        <p className="px-4 pb-10 text-sm text-muted">No albums logged yet.</p>
      ) : (
        logs.map((log) => (
          <AlbumLogCard
            key={log.id}
            log={{
              id: log.id,
              rating: log.rating,
              reviewText: log.reviewText,
              listenedOn: log.listenedOn,
              isRelisten: log.isRelisten,
              containsSpoilers: log.containsSpoilers,
              user: {
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
              },
              album: log.album,
            }}
          />
        ))
      )}
    </div>
  );
}
