"use client";

import { createContext, useCallback, useContext, useState } from "react";

export interface PrefillAlbum {
  id: string;
  title: string;
  artistName: string;
  coverArtUrl: string | null;
}

interface LogSheetContextValue {
  isOpen: boolean;
  prefillAlbum: PrefillAlbum | null;
  isAuthenticated: boolean;
  openLogSheet: (album?: PrefillAlbum) => void;
  closeLogSheet: () => void;
}

const LogSheetContext = createContext<LogSheetContextValue | null>(null);

export function LogSheetProvider({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefillAlbum, setPrefillAlbum] = useState<PrefillAlbum | null>(null);

  const openLogSheet = useCallback((album?: PrefillAlbum) => {
    setPrefillAlbum(album ?? null);
    setIsOpen(true);
  }, []);

  const closeLogSheet = useCallback(() => {
    setIsOpen(false);
    setPrefillAlbum(null);
  }, []);

  return (
    <LogSheetContext.Provider
      value={{ isOpen, prefillAlbum, isAuthenticated, openLogSheet, closeLogSheet }}
    >
      {children}
    </LogSheetContext.Provider>
  );
}

export function useLogSheet() {
  const ctx = useContext(LogSheetContext);
  if (!ctx) throw new Error("useLogSheet must be used within LogSheetProvider");
  return ctx;
}
