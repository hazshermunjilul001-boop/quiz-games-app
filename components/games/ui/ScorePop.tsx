"use client";

export default function ScorePop({ value, show }: { value: string; show: boolean }) {
  if (!show) return null;
  return <span className="score-pop" aria-hidden="true">{value}</span>;
}
