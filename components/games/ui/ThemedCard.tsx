"use client";

import { ReactNode } from "react";

export default function ThemedCard({ children, family = "classic", className = "" }: { children: ReactNode; family?: "arcade" | "paper" | "classic"; className?: string }) {
  return <section className={`game-surface game-surface-${family} ${className}`}>{children}</section>;
}
