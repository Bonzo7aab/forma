import Link from "next/link";
import { cn } from "@/lib/cn";

const quarters = [
  "M21.71 3.69A16.4 16.4 0 0 1 36.31 18.29L28.16 19.14A8.2 8.2 0 0 0 20.86 11.84Z",
  "M36.31 21.71A16.4 16.4 0 0 1 21.71 36.31L20.86 28.16A8.2 8.2 0 0 0 28.16 20.86Z",
  "M18.29 36.31A16.4 16.4 0 0 1 3.69 21.71L11.84 20.86A8.2 8.2 0 0 0 19.14 28.16Z",
  "M3.69 18.29A16.4 16.4 0 0 1 18.29 3.69L19.14 11.84A8.2 8.2 0 0 0 11.84 19.14Z",
];

export function Logo({ tone = "ink", compact = false }: { tone?: "ink" | "paper"; compact?: boolean }) {
  const onDark = tone === "paper";

  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine sm:gap-3"
    >
      <Mark onDark={onDark} className={compact ? "size-9 sm:size-11" : "size-11"} />
      <span>
        <span
          className={cn(
            "block font-serif italic leading-none tracking-[-0.045em]",
            compact ? "text-2xl sm:text-[1.65rem]" : "text-[1.65rem]",
            onDark ? "text-paper" : "text-ink",
          )}
        >
          Forma
        </span>
        <span
          className={cn(
            "mt-1 flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-[0.24em]",
            compact && "max-sm:hidden",
            onDark ? "text-paper/70" : "text-muted",
          )}
        >
          <span className={`h-px w-3.5 ${onDark ? "bg-gold-bright" : "bg-gold"}`} aria-hidden />
          Cztery kwartały
        </span>
      </span>
    </Link>
  );
}

function Mark({ onDark, className }: { onDark: boolean; className?: string }) {
  const ground = onDark ? "var(--paper)" : "var(--pine)";
  const ink = onDark ? "var(--pine)" : "var(--paper)";
  const gold = onDark ? "var(--gold)" : "var(--gold-bright)";

  return (
    <svg viewBox="0 0 40 40" className={cn("shrink-0", className ?? "size-11")} aria-hidden="true">
      <circle cx="20" cy="20" r="19.5" fill={ground} />
      <path d={quarters[0]} fill={ink} opacity="0.38" />
      <path d={quarters[1]} fill={ink} opacity="0.58" />
      <path d={quarters[2]} fill={ink} opacity="0.84" />
      <path d={quarters[3]} fill={gold} />
      <circle cx="20" cy="20" r="2.15" fill={gold} />
    </svg>
  );
}
