import Link from "next/link";
import { StarRatingDisplay } from "@/components/star-rating";

export interface MusicVideoLogCardData {
  id: string;
  rating: number | null;
  reviewText: string | null;
  createdAt: Date;
  user: { username: string; displayName: string; avatarUrl: string | null };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    date
  );
}

export function MusicVideoLogCard({ log }: { log: MusicVideoLogCardData }) {
  return (
    <article className="border-b border-border px-4 py-4">
      <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
        <Link href={`/u/${log.user.username}`} className="font-medium hover:underline">
          {log.user.displayName}
        </Link>
        <span className="text-muted">watched this</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
        <StarRatingDisplay rating={log.rating} size={13} />
        <span>{formatDate(log.createdAt)}</span>
      </div>
      {log.reviewText && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{log.reviewText}</p>
      )}
    </article>
  );
}
