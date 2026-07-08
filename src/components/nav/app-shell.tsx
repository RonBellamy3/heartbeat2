import type { Session } from "next-auth";
import { LogSheetProvider } from "@/components/log-sheet/context";
import { LogSheet } from "@/components/log-sheet/log-sheet";
import { TopNav } from "@/components/nav/top-nav";
import { BottomNav } from "@/components/nav/bottom-nav";

export function AppShell({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <LogSheetProvider isAuthenticated={Boolean(session?.user)}>
      <TopNav session={session} />
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
      <BottomNav username={session?.user?.username} />
      <LogSheet />
    </LogSheetProvider>
  );
}
