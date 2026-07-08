import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StarRatingDisplay } from "@/components/star-rating";
import { MusicVideoLogCard } from "@/components/music-video-log-card";
import { OwnMusicVideoLogCard } from "@/components/own-music-video-log-card";
import { BetaBadge } from "@/components/beta-badge";

export default async function MusicVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const video = await prisma.musicVideo.findUnique({ where: { id } });
  if (!video) notFound();

  const logs = await prisma.musicVideoLog.findMany({
    where: { musicVideoId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });

  const rated = logs.filter((l) => l.rating != null);
  const average =
    rated.length > 0 ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length : null;

  const ownLogs = session?.user ? logs.filter((l) => l.userId === session.user.id) : [];
  const otherLogs = session?.user ? logs.filter((l) => l.userId !== session.user.id) : logs;

  return (
    <div className="mx-auto max-w-xl">
      <div className="px-4 pt-6">
        <div className="mb-2">
          <BetaBadge />
        </div>
        <h1 className="text-lg font-semibold leading-tight">{video.title}</h1>
        <p className="text-sm text-muted">{video.artistName}</p>
        {video.videoUrl && (
          <a
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-accent hover:underline"
          >
            Watch the video
          </a>
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
      </div>

      <div className="mt-6">
        {ownLogs.length > 0 && (
          <div>
            {ownLogs.map((log) => (
              <OwnMusicVideoLogCard
                key={log.id}
                log={{ id: log.id, rating: log.rating, reviewText: log.reviewText }}
              />
            ))}
          </div>
        )}

        <h2 className="px-4 pb-2 pt-4 text-sm font-semibold text-muted">Reviews</h2>
        {otherLogs.length === 0 ? (
          <p className="px-4 pb-8 text-sm text-muted">
            No reviews yet.{" "}
            {!session?.user && (
              <>
                <Link href="/login" className="text-accent hover:underline">
                  Sign in
                </Link>{" "}
                to log this video.
              </>
            )}
          </p>
        ) : (
          otherLogs.map((log) => (
            <MusicVideoLogCard
              key={log.id}
              log={{
                id: log.id,
                rating: log.rating,
                reviewText: log.reviewText,
                createdAt: log.createdAt,
                user: log.user,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
