"use client";

const COLORS = ["#1F6E5C", "#E8A93B", "#E4574B", "#2F9E5B", "#6366F1", "#EC4899"];
const PIECES = 28;

interface ConfettiStyle extends React.CSSProperties {
  "--drift": string;
  "--rotate": string;
}

export default function Confetti() {
  const pieces = Array.from({ length: PIECES }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 300;
    const duration = 1400 + Math.random() * 900;
    const color = COLORS[i % COLORS.length];
    const rotate = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 120;
    const size = 6 + Math.random() * 6;
    return { id: i, left, delay, duration, color, rotate, drift, size };
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            "--drift": `${p.drift}px`,
            "--rotate": `${p.rotate}deg`,
          } as ConfettiStyle}
        />
      ))}

      <style jsx>{`
        .confetti-piece {
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
        }
        @keyframes confetti-fall {
          0% {
            transform: translate(0, -20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--drift), 260px) rotate(var(--rotate));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
