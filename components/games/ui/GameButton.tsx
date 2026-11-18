"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

export default function GameButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={`game-button inline-flex items-center justify-center gap-2 rounded-2xl font-black transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}
