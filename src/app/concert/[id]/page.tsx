import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StarRatingDisplay } from "@/components/star-rating";
import { ConcertLogCard } from "@/components/concert-log-card";
import { OwnConcertLogCard } from "@/components/own-concert-log-card";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function ConcertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const concert = await prisma.concert.findUnique({ where: { id } });
  if (!concert) notFound();

  const logs = await prisma.concertLog.findMany({
    where: { concertId: id, deletedAt: null },
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
        <h1 className="text-lg font-semibold leading-tight">{concert.artistName}</h1>
        <p className="text-sm text-muted">
          {concert.venueName} · {concert.city}
        </p>
        <p className="text-xs text-subtle">
          {formatDate(concert.eventDate)}
          {concert.tourName ? ` · ${concert.tourName}` : ""}
        </p>

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
              <OwnConcertLogCard
                key={log.id}
                log={{
                  id: log.id,
                  rating: log.rating,
                  reviewText: log.reviewText,
                  setlistNotes: log.setlistNotes,
                }}
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
                to log this show.
              </>
            )}
          </p>
        ) : (
          otherLogs.map((log) => (
            <ConcertLogCard
              key={log.id}
              log={{
                id: log.id,
                rating: log.rating,
                reviewText: log.reviewText,
                setlistNotes: log.setlistNotes,
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
