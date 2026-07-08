import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { LogSheetProvider } from "@/components/log-sheet/context";
import { LogSheet } from "@/components/log-sheet/log-sheet";
import { TopNav } from "@/components/nav/top-nav";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MobileHeader } from "@/components/nav/mobile-header";

export async function AppShell({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  // The JWT's `picture` claim only refreshes on next sign-in, so read the
  // current avatar straight from the DB to reflect profile edits immediately.
  const avatarUrl = session?.user
    ? (
        await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { avatarUrl: true },
        })
      )?.avatarUrl ?? null
    : null;

  return (
    <LogSheetProvider isAuthenticated={Boolean(session?.user)}>
      <TopNav session={session} avatarUrl={avatarUrl} />
      <MobileHeader username={session?.user?.username} avatarUrl={avatarUrl} />
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
      <BottomNav username={session?.user?.username} />
      <LogSheet />
    </LogSheetProvider>
  );
}
