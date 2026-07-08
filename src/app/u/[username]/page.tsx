import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AlbumLogCard } from "@/components/album-log-card";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      deletedAt: true,
    },
  });
  if (!user || user.deletedAt) notFound();

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

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-4 px-4 pt-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-lg font-semibold">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            user.displayName[0]?.toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{user.displayName}</h1>
          <p className="text-sm text-muted">@{user.username}</p>
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
