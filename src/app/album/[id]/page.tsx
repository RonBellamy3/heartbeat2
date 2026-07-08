import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StarRatingDisplay } from "@/components/star-rating";
import { AlbumLogCard } from "@/components/album-log-card";
import { OwnLogCard } from "@/components/own-log-card";
import { LogAlbumButton } from "@/components/log-album-button";
import { CoverImage } from "@/components/cover-image";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) notFound();

  const logs = await prisma.albumLog.findMany({
    where: { albumId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });

  const rated = logs.filter((l) => l.rating != null);
  const average =
    rated.length > 0
      ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
      : null;

  const ownLogs = session?.user
    ? logs.filter((l) => l.userId === session.user.id)
    : [];
  const otherLogs = session?.user
    ? logs.filter((l) => l.userId !== session.user.id)
    : logs;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex gap-4 px-4 pt-6">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-sunken shadow-lg">
          <CoverImage src={album.coverArtUrl} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight">{album.title}</h1>
          <p className="text-sm text-muted">{album.artistName}</p>
          {album.releaseYear && (
            <p className="text-xs text-subtle">{album.releaseYear}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <StarRatingDisplay rating={average} size={16} />
            {average != null ? (
              <span className="text-xs text-muted">
                {average.toFixed(1)} · {rated.length} rating{rated.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="text-xs text-muted">No ratings yet</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-subtle">
            {logs.length} log{logs.length === 1 ? "" : "s"}
          </p>

          <div className="mt-4">
            <LogAlbumButton
              album={{
                id: album.id,
                title: album.title,
                artistName: album.artistName,
                coverArtUrl: album.coverArtUrl,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        {ownLogs.length > 0 && (
          <div>
            {ownLogs.map((log) => (
              <OwnLogCard
                key={log.id}
                log={{
                  id: log.id,
                  rating: log.rating,
                  reviewText: log.reviewText,
                  listenedOn: log.listenedOn.toISOString(),
                  isRelisten: log.isRelisten,
                  containsSpoilers: log.containsSpoilers,
                }}
              />
            ))}
          </div>
        )}

        <h2 className="px-4 pb-2 pt-4 text-sm font-semibold text-muted">
          Reviews
        </h2>
        {otherLogs.length === 0 ? (
          <p className="px-4 pb-8 text-sm text-muted">No reviews yet.</p>
        ) : (
          otherLogs.map((log) => (
            <AlbumLogCard
              key={log.id}
              showAlbum={false}
              log={{
                id: log.id,
                rating: log.rating,
                reviewText: log.reviewText,
                listenedOn: log.listenedOn,
                isRelisten: log.isRelisten,
                containsSpoilers: log.containsSpoilers,
                user: log.user,
                album: {
                  id: album.id,
                  title: album.title,
                  artistName: album.artistName,
                  coverArtUrl: album.coverArtUrl,
                },
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
