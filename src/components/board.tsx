"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { Header } from "@/components/header";
import { cn } from "@/lib/cn";
import { directionCopy, formatDate, formatDelta, formatValue, scoreTone, sessionLabel } from "@/lib/format";

type Overview = FunctionReturnType<typeof api.board.overview>;

export function Board() {
  const data = useQuery(api.board.overview);
  if (data === undefined) return <BoardSkeleton />;
  return <BoardView data={data} />;
}

function BoardView({ data }: { data: Overview }) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("osoba");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Wszystkie");
  const [mode, setMode] = useState<"osoba" | "grupa">("osoba");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const names = new Set(data.athletes.map((athlete) => athlete.group).filter(Boolean));
    return ["Wszystkie", ...Array.from(names).sort((a, b) => a.localeCompare(b, "pl"))];
  }, [data.athletes]);

  const filtered = data.athletes.filter((athlete) => {
    const matchesGroup = group === "Wszystkie" || athlete.group === group;
    const haystack = `${athlete.name} ${athlete.group}`.toLocaleLowerCase("pl");
    return matchesGroup && haystack.includes(query.trim().toLocaleLowerCase("pl"));
  });

  const selected = filtered.find((athlete) => athlete.id === requested) ?? filtered[0] ?? null;
  const exercise = data.exercises.find((item) => item.id === exerciseId) ?? data.exercises[0] ?? null;
  const session = data.sessions.find((item) => item.id === sessionId) ?? data.sessions.at(-1) ?? null;
  const hasSamples = data.athletes.some((athlete) => athlete.sample);

  function chooseAthlete(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("osoba", id);
    router.replace(`/?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-auto">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold">Podopieczni</p>
              <h2 className="mt-1 font-serif text-2xl tracking-tight">{data.athletes.length}</h2>
            </div>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj osoby"
            className="mt-4 h-11 w-full rounded-xl border border-line bg-card px-3 text-sm outline-none focus:border-pine"
            aria-label="Szukaj podopiecznego"
          />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {groups.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGroup(item)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs font-medium",
                  group === item ? "bg-ink text-paper" : "bg-card text-muted",
                )}
              >
                {item || "Bez grupy"}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {filtered.map((athlete) => {
              const trend = athleteTrend(data, athlete.id);
              const active = selected?.id === athlete.id && mode === "osoba";
              return (
                <button
                  key={athlete.id}
                  type="button"
                  onClick={() => {
                    setMode("osoba");
                    chooseAthlete(athlete.id);
                  }}
                  className={cn(
                    "min-w-52 shrink-0 rounded-2xl border px-3 py-3 text-left transition-colors lg:w-full",
                    active ? "border-pine bg-pine text-paper" : "border-line bg-card hover:border-pine/40",
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium">{athlete.name}</span>
                    <TrendMark tone={trend} inverted={active} />
                  </span>
                  <span className={cn("mt-1 block text-xs", active ? "text-paper/70" : "text-muted")}>
                    {athlete.group || "Bez grupy"}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 ? <p className="px-1 py-6 text-sm text-muted">Nikt nie pasuje do wyszukiwania.</p> : null}
          </div>
        </aside>

        <section className="min-w-0">
          {hasSamples ? (
            <p className="mb-4 rounded-2xl bg-gold-soft px-4 py-3 text-sm text-gold">
              Widzisz dane przykładowe. Administrator może je usunąć i wpisać prawdziwe pomiary.
            </p>
          ) : null}
          {data.athletes.length === 0 || data.exercises.length === 0 ? (
            <EmptyBoard />
          ) : (
            <>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gold">
                    {mode === "osoba" ? "Przebieg osoby" : "Widok grupy"}
                  </p>
                  <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
                    {mode === "osoba" ? selected?.name : "Cała grupa"}
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    {mode === "osoba"
                      ? `${selected?.group || "Bez grupy"} · ${data.sessions.length} ${pluralSessions(data.sessions.length)}`
                      : "Porównanie wyników w wybranym kwartale"}
                  </p>
                </div>
                <div className="no-print inline-flex rounded-full border border-line bg-card p-1">
                  {(
                    [
                      ["osoba", "Osoba"],
                      ["grupa", "Kwartał"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={cn(
                        "h-9 rounded-full px-4 text-sm",
                        mode === value ? "bg-pine text-paper" : "text-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "osoba" && selected && exercise ? (
                <PersonView
                  data={data}
                  athleteId={selected.id}
                  exerciseId={exercise.id}
                  onExercise={setExerciseId}
                />
              ) : null}
              {mode === "grupa" && session ? (
                <GroupView data={data} sessionId={session.id} onSession={setSessionId} />
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function PersonView({
  data,
  athleteId,
  exerciseId,
  onExercise,
}: {
  data: Overview;
  athleteId: string;
  exerciseId: string;
  onExercise: (id: string) => void;
}) {
  const exercise = data.exercises.find((item) => item.id === exerciseId) ?? data.exercises[0];
  const compared = data.exercises.filter((item) => {
    const pair = seriesEnds(data, athleteId, item.id);
    return pair.latest && pair.previous;
  }).length;
  const improved = data.exercises.filter((item) => {
    const pair = seriesEnds(data, athleteId, item.id);
    if (!pair.latest || !pair.previous) return false;
    return scoreTone(pair.latest.value, pair.previous.value, item.higherIsBetter) === "up";
  }).length;

  return (
    <div className="mt-8 flex flex-col gap-6">
      {compared > 0 ? (
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">{improved} z {compared}</span> ćwiczeń lepszych niż w poprzednim kwartale.
        </p>
      ) : (
        <p className="text-sm text-muted">Pierwszy pomiar tej osoby — porównanie pojawi się przy kolejnym kwartale.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.exercises.map((item) => {
          const pair = seriesEnds(data, athleteId, item.id);
          const tone = pair.latest && pair.previous ? scoreTone(pair.latest.value, pair.previous.value, item.higherIsBetter) : "flat";
          const active = item.id === exercise.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onExercise(item.id)}
              className={cn(
                "rounded-3xl border p-4 text-left transition-colors",
                active ? "border-pine bg-moss" : "border-line bg-card hover:border-pine/30",
              )}
            >
              <span className="block text-xs uppercase tracking-[0.14em] text-muted">{item.name}</span>
              <span className="mt-3 block font-serif text-3xl tabular-nums tracking-tight">
                {pair.latest ? formatValue(pair.latest.value, item.unit) : "—"}
                <span className="ml-1 font-sans text-sm text-muted">{item.unit}</span>
              </span>
              <span className={cn("mt-2 block text-xs", tone === "up" && "text-pine", tone === "down" && "text-clay", tone === "flat" && "text-muted")}>
                {pair.latest && pair.previous
                  ? `${formatDelta(pair.latest.value, pair.previous.value, item.unit)} ${item.unit} wobec ${sessionLabel(pair.previous.session)}`
                  : "Brak porównania"}
              </span>
            </button>
          );
        })}
      </div>
      <article className="rounded-3xl border border-line bg-card p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">{exercise.name}</h2>
            <p className="mt-1 text-sm text-muted">{directionCopy(exercise.higherIsBetter)} · {exercise.unit}</p>
          </div>
        </div>
        <ProgressChart data={data} athleteId={athleteId} exercise={exercise} />
      </article>
      <div className="overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">Wyniki wszystkich kwartałów</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.14em] text-muted">
              <th className="sticky left-0 bg-card px-4 py-3 font-medium">Ćwiczenie</th>
              {data.sessions.map((session) => (
                <th key={session.id} className="px-4 py-3 font-medium">
                  {sessionLabel(session)}
                  <span className="mt-1 block normal-case tracking-normal">{formatDate(session.testedAt)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.exercises.map((item) => (
              <tr key={item.id} className="border-b border-line/70 last:border-0">
                <th className="sticky left-0 bg-card px-4 py-3 text-left font-medium">{item.name}</th>
                {data.sessions.map((session, index) => {
                  const value = lookup(data, athleteId, item.id, session.id);
                  const previousSession = data.sessions[index - 1];
                  const previous = previousSession ? lookup(data, athleteId, item.id, previousSession.id) : null;
                  const tone = value !== null && previous !== null ? scoreTone(value, previous, item.higherIsBetter) : "flat";
                  return (
                    <td key={session.id} className="px-4 py-3 tabular-nums">
                      {value === null ? <span className="text-muted">—</span> : formatValue(value, item.unit)}
                      {value !== null && previous !== null ? (
                        <span className={cn("mt-1 block text-xs", tone === "up" && "text-pine", tone === "down" && "text-clay", tone === "flat" && "text-muted")}>
                          {formatDelta(value, previous, item.unit)}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupView({
  data,
  sessionId,
  onSession,
}: {
  data: Overview;
  sessionId: string;
  onSession: (id: string) => void;
}) {
  const [sortExercise, setSortExercise] = useState<string>("name");
  const session = data.sessions.find((item) => item.id === sessionId) ?? data.sessions.at(-1);
  if (!session) return null;
  const exercise = data.exercises.find((item) => item.id === sortExercise);
  const rows = data.athletes.slice().sort((a, b) => {
    if (!exercise) return a.name.localeCompare(b.name, "pl");
    const left = lookup(data, a.id, exercise.id, session.id);
    const right = lookup(data, b.id, exercise.id, session.id);
    if (left === null && right === null) return a.name.localeCompare(b.name, "pl");
    if (left === null) return 1;
    if (right === null) return -1;
    const delta = exercise.higherIsBetter ? right - left : left - right;
    return delta || a.name.localeCompare(b.name, "pl");
  });

  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto">
        {data.sessions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSession(item.id)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm",
              item.id === session.id ? "bg-ink text-paper" : "bg-card text-muted",
            )}
          >
            {sessionLabel(item)}
          </button>
        ))}
      </div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted">
          {formatDate(session.testedAt)}
          {session.note ? ` · ${session.note}` : ""}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sortuj według
          <select
            value={sortExercise}
            onChange={(event) => setSortExercise(event.target.value)}
            className="h-10 rounded-full border border-line bg-card px-3 text-ink"
          >
            <option value="name">Nazwiska</option>
            {data.exercises.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.14em] text-muted">
              <th className="sticky left-0 bg-card px-4 py-3 font-medium">Osoba</th>
              {data.exercises.map((item) => (
                <th key={item.id} className="px-4 py-3 font-medium">
                  {item.name}
                  <span className="mt-1 block normal-case tracking-normal">{item.unit}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((athlete) => (
              <tr key={athlete.id} className="border-b border-line/70 last:border-0">
                <th className="sticky left-0 bg-card px-4 py-3 text-left">
                  <span className="block font-medium">{athlete.name}</span>
                  <span className="text-xs font-normal text-muted">{athlete.group || "Bez grupy"}</span>
                </th>
                {data.exercises.map((item) => {
                  const value = lookup(data, athlete.id, item.id, session.id);
                  return (
                    <td key={item.id} className="px-4 py-3 tabular-nums">
                      {value === null ? <span className="text-muted">—</span> : formatValue(value, item.unit)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProgressChart({
  data,
  athleteId,
  exercise,
}: {
  data: Overview;
  athleteId: string;
  exercise: Overview["exercises"][number];
}) {
  const points = data.sessions.map((session) => ({
    label: sessionLabel(session),
    value: lookup(data, athleteId, exercise.id, session.id),
  }));
  const plotted = points.some((point) => point.value !== null);
  if (!plotted) {
    return <p className="py-16 text-center text-sm text-muted">Brak wyników tego ćwiczenia.</p>;
  }
  const numbers = points.flatMap((point) => (point.value === null ? [] : [point.value]));
  const low = Math.min(...numbers);
  const high = Math.max(...numbers);
  const pad = Math.max((high - low) * 0.45, Math.abs(high) * 0.04, 0.2);
  return (
    <div className="mt-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4dccf" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#645f56", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[low - pad, high + pad]}
            tick={{ fill: "#645f56", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              const value = payload?.[0]?.value;
              if (!active || typeof value !== "number") return null;
              return (
                <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-sm">
                  <p className="text-muted">{label}</p>
                  <p className="font-medium tabular-nums">
                    {formatValue(value, exercise.unit)} {exercise.unit}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1e4d3a"
            strokeWidth={2.5}
            connectNulls={false}
            dot={{ r: 4, stroke: "#1e4d3a", strokeWidth: 2, fill: "#fffdf8" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="mt-10 rounded-3xl border border-dashed border-line bg-card px-6 py-16 text-center">
      <h1 className="font-serif text-4xl tracking-tight">Jeszcze bez pomiarów</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
        Gdy administrator doda podopiecznych, ćwiczenia i pierwszy kwartał, wyniki pojawią się tutaj dla wszystkich odwiedzających.
      </p>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b border-line" />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <div className="h-80 animate-pulse rounded-3xl bg-card" />
        <div className="h-96 animate-pulse rounded-3xl bg-card" />
      </div>
    </div>
  );
}

function TrendMark({ tone, inverted }: { tone: "up" | "down" | "flat"; inverted: boolean }) {
  const symbol = tone === "up" ? "↑" : tone === "down" ? "↓" : "·";
  return (
    <span className={cn("text-sm", !inverted && tone === "up" && "text-pine", !inverted && tone === "down" && "text-clay", inverted && "text-paper")}>
      {symbol}
    </span>
  );
}

function lookup(data: Overview, athleteId: string, exerciseId: string, sessionId: string) {
  const result = data.results.find(
    (item) => item.athleteId === athleteId && item.exerciseId === exerciseId && item.sessionId === sessionId,
  );
  return result ? result.value : null;
}

function seriesEnds(data: Overview, athleteId: string, exerciseId: string) {
  const points = data.sessions
    .map((session) => {
      const value = lookup(data, athleteId, exerciseId, session.id);
      return value === null ? null : { session, value };
    })
    .filter((point): point is { session: Overview["sessions"][number]; value: number } => point !== null);
  return {
    latest: points.at(-1) ?? null,
    previous: points.length > 1 ? points[points.length - 2] : null,
  };
}

function athleteTrend(data: Overview, athleteId: string) {
  let up = 0;
  let down = 0;
  for (const exercise of data.exercises) {
    const pair = seriesEnds(data, athleteId, exercise.id);
    if (!pair.latest || !pair.previous) continue;
    const tone = scoreTone(pair.latest.value, pair.previous.value, exercise.higherIsBetter);
    if (tone === "up") up += 1;
    if (tone === "down") down += 1;
  }
  if (up === 0 && down === 0) return "flat" as const;
  return up >= down ? ("up" as const) : ("down" as const);
}

function pluralSessions(count: number) {
  if (count === 1) return "pomiar";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "pomiary";
  return "pomiarów";
}
