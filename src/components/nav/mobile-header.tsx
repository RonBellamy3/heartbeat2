import Link from "next/link";
import { Wordmark } from "@/components/logo";

export function MobileHeader({
  username,
  avatarUrl,
}: {
  username?: string;
  avatarUrl: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
      <Link href="/">
        <Wordmark />
      </Link>
      {username && (
        <Link href={`/u/${username}`}>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-sunken">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-medium">
                {username[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>
      )}
    </header>
  );
}
