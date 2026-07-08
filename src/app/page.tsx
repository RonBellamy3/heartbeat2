import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogoMark } from "@/components/logo";
import { AlbumLogCard } from "@/components/album-log-card";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <LogoMark size={64} className="mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight">Heartbeat</h1>
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

  const logs = await prisma.albumLog.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: {
      user: { select: { username: true, displayName: true, avatarUrl: true } },
      album: { select: { id: true, title: true, artistName: true, coverArtUrl: true } },
    },
  });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="px-4 pt-6 pb-2 text-lg font-semibold">Recent activity</h1>
      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-sm text-muted">
            Nothing logged yet. Be the first — tap the + button to log an album.
          </p>
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
