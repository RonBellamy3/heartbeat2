import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CoverImage } from "@/components/cover-image";
import { StarRatingDisplay } from "@/components/star-rating";
import { LogConcertButton } from "@/components/log-concert-button";
import { LogVideoButton } from "@/components/log-video-button";
import { BetaBadge } from "@/components/beta-badge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    date
  );
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const artist = await prisma.artist.findUnique({ where: { id } });
  if (!artist) notFound();

  const now = new Date();

  const albums = await prisma.album.findMany({
    where: {
      OR: [
        artist.musicbrainzId ? { artistMbid: artist.musicbrainzId } : undefined,
        { artistName: { equals: artist.name, mode: "insensitive" } },
      ].filter(Boolean) as object[],
      AND: [{ OR: [{ releaseDate: null }, { releaseDate: { lte: now } }] }],
    },
    orderBy: [{ releaseYear: "desc" }],
    take: 50,
  });

  const concerts = await prisma.concert.findMany({
    where: {
      eventDate: { lte: now },
      OR: [
        artist.musicbrainzId ? { artistMbid: artist.musicbrainzId } : undefined,
        { artistId: artist.id },
      ].filter(Boolean) as object[],
    },
    orderBy: { eventDate: "desc" },
    take: 50,
    include: { logs: { where: { deletedAt: null }, select: { rating: true } } },
  });

  const videos = await prisma.musicVideo.findMany({
    where: {
      OR: [
        artist.musicbrainzId ? { artistMbid: artist.musicbrainzId } : undefined,
        { artistId: artist.id },
      ].filter(Boolean) as object[],
      AND: [{ OR: [{ releaseDate: null }, { releaseDate: { lte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { logs: { where: { deletedAt: null }, select: { rating: true } } },
  });

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-4 px-4 pt-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-2xl font-semibold">
          {artist.photoUrl ? (
            <CoverImage src={artist.photoUrl} className="h-full w-full object-cover" />
          ) : (
            artist.name[0]?.toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{artist.name}</h1>
          <p className="text-sm text-muted">
            {albums.length} album{albums.length === 1 ? "" : "s"} · {concerts.length} show
            {concerts.length === 1 ? "" : "s"} logged
          </p>
        </div>
      </div>

      <h2 className="px-4 pb-2 pt-6 text-sm font-semibold text-muted">Albums</h2>
      {albums.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted">No released albums found yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 px-4 pb-2">
          {albums.map((album) => (
            <Link key={album.id} href={`/album/${album.id}`} className="block">
              <div className="aspect-square overflow-hidden rounded-lg bg-sunken">
                <CoverImage src={album.coverArtUrl} className="h-full w-full object-cover" />
              </div>
              <p className="mt-1 truncate text-xs font-medium">{album.title}</p>
              {album.releaseYear && (
                <p className="text-[11px] text-subtle">{album.releaseYear}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-4 pb-2 pt-6">
        <h2 className="text-sm font-semibold text-muted">Concerts</h2>
        <LogConcertButton
          artist={{ id: artist.id, name: artist.name, musicbrainzId: artist.musicbrainzId }}
        />
      </div>
      {concerts.length === 0 ? (
        <p className="px-4 pb-10 text-sm text-muted">
          No past shows logged yet for {artist.name}. Be the first.
        </p>
      ) : (
        <div className="pb-10">
          {concerts.map((concert) => {
            const rated = concert.logs.filter((l) => l.rating != null);
            const avg =
              rated.length > 0
                ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
                : null;
            return (
              <Link
                key={concert.id}
                href={`/concert/${concert.id}`}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {concert.venueName} · {concert.city}
                  </p>
                  <p className="text-xs text-muted">{formatDate(concert.eventDate)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StarRatingDisplay rating={avg} size={13} />
                  <span className="text-xs text-subtle">{concert.logs.length}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between px-4 pb-2 pt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted">Music Videos</h2>
          <BetaBadge />
        </div>
        <LogVideoButton
          artist={{ id: artist.id, name: artist.name, musicbrainzId: artist.musicbrainzId }}
        />
      </div>
      {videos.length === 0 ? (
        <p className="px-4 pb-10 text-sm text-muted">
          No music videos logged yet for {artist.name}. Be the first.
        </p>
      ) : (
        <div className="pb-10">
          {videos.map((video) => {
            const rated = video.logs.filter((l) => l.rating != null);
            const avg =
              rated.length > 0
                ? rated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / rated.length
                : null;
            return (
              <Link
                key={video.id}
                href={`/video/${video.id}`}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 hover:bg-white/5"
              >
                <p className="min-w-0 truncate text-sm font-medium">{video.title}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <StarRatingDisplay rating={avg} size={13} />
                  <span className="text-xs text-subtle">{video.logs.length}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
