import Link from "next/link";

export function Logo({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  return (
    <Link href="/" className="flex items-center gap-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pine">
      <span
        className={`grid size-9 place-items-center rounded-2xl font-serif text-lg ${
          tone === "paper" ? "bg-paper text-pine" : "bg-pine text-paper"
        }`}
      >
        F
      </span>
      <span>
        <span className={`block font-serif text-xl leading-none tracking-tight ${tone === "paper" ? "text-paper" : "text-ink"}`}>
          Forma
        </span>
        <span className={`mt-1 block text-[0.68rem] uppercase tracking-[0.18em] ${tone === "paper" ? "text-paper/70" : "text-muted"}`}>
          Testy sprawności
        </span>
      </span>
    </Link>
  );
}
