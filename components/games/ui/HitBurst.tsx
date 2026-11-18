"use client";

export default function HitBurst({ active, tone = "gold" }: { active: boolean; tone?: "gold" | "sky" | "coral" }) {
  if (!active) return null;
  const colors = tone === "sky" ? ["#38bdf8", "#0ea5e9", "#fef08a"] : tone === "coral" ? ["#fb7185", "#f97316", "#fde68a"] : ["#facc15", "#f59e0b", "#fff7ad"];
  return (
    <span className="hit-burst" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ backgroundColor: colors[i % colors.length], transform: `rotate(${i * 36}deg) translateY(-${28 + (i % 3) * 8}px)` }} />
      ))}
    </span>
  );
}
