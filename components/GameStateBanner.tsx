"use client";

import { useGameState } from "@/lib/hooks/useGameState";

export function GameStatusBanner() {
  const { isActive } = useGameState();

  if (isActive === null || isActive) return null;

  return (
    <div className="bg-destructive text-destructive-foreground text-center py-2 text-sm">
      Game is not active — view only mode
    </div>
  );
}
