import Link from "next/link";
import { StarRatingDisplay } from "@/components/star-rating";
import { CoverImage } from "@/components/cover-image";

export interface AlbumLogCardData {
  id: string;
  rating: number | null;
  reviewText: string | null;
  listenedOn: Date;
  isRelisten: boolean;
  containsSpoilers: boolean;
  user: { username: string; displayName: string; avatarUrl: string | null };
  album: { id: string; title: string; artistName: string; coverArtUrl: string | null };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    date
  );
}

export function AlbumLogCard({ log, showAlbum = true }: { log: AlbumLogCardData; showAlbum?: boolean }) {
  return (
    <article className="flex gap-3 border-b border-border px-4 py-4">
      {showAlbum && (
        <Link href={`/album/${log.album.id}`} className="shrink-0">
          <div className="h-16 w-16 overflow-hidden rounded bg-sunken">
            <CoverImage src={log.album.coverArtUrl} className="h-full w-full object-cover" />
          </div>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <Link href={`/u/${log.user.username}`} className="font-medium hover:underline">
            {log.user.displayName}
          </Link>
          <span className="text-muted">
            {log.isRelisten ? "relistened to" : "logged"}
          </span>
          {showAlbum && (
            <Link href={`/album/${log.album.id}`} className="font-medium hover:underline">
              {log.album.title}
            </Link>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <StarRatingDisplay rating={log.rating} size={13} />
          <span>{formatDate(log.listenedOn)}</span>
        </div>
        {log.reviewText && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
            {log.containsSpoilers ? (
              <details>
                <summary className="cursor-pointer text-xs text-muted">
                  Contains spoilers — tap to reveal
                </summary>
                <span className="mt-1 block">{log.reviewText}</span>
              </details>
            ) : (
              log.reviewText
            )}
          </p>
        )}
      </div>
    </article>
  );
}
