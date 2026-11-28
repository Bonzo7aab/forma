"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { Header } from "@/components/header";
import { cn } from "@/lib/cn";
import { directionCopy, formatDate, formatDelta, formatValue, scoreTone, sessionLabel } from "@/lib/format";

type GroupBoard = Extract<FunctionReturnType<typeof api.board.forGroup>, { ok: true }>;

export function Board({ token, onLeave }: { token: string; onLeave: () => void }) {
  const data = useQuery(api.board.forGroup, { token });
  useEffect(() => {
    if (data?.ok === false) onLeave();
  }, [data, onLeave]);
  if (data === undefined || !data.ok) return <BoardSkeleton />;
  return <BoardView data={data} onLeave={onLeave} />;
}

function BoardView({ data, onLeave }: { data: GroupBoard; onLeave: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("osoba");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"osoba" | "grupa">("osoba");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const filtered = data.athletes.filter((athlete) =>
    athlete.name.toLocaleLowerCase("pl").includes(query.trim().toLocaleLowerCase("pl")),
  );

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
      <Header onChangeGroup={onLeave} />
      <main className="mx-auto grid w-full min-w-0 max-w-7xl gap-6 overflow-x-clip px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-auto">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl tracking-tight">{data.groupName}</h2>
            <p className="text-sm text-muted">
              {data.athletes.length} {pluralAthletes(data.athletes.length)}
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj osoby"
            className="mt-3 h-11 w-full rounded-xl border border-line bg-card px-3 text-base outline-none focus:border-pine sm:text-sm"
            aria-label="Szukaj podopiecznego"
          />
          <div className="mt-3 flex w-full min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
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
                    "shrink-0 rounded-full border py-2 pr-2.5 pl-3 text-left transition-colors lg:w-full lg:rounded-2xl lg:px-3 lg:py-3",
                    active ? "border-pine bg-pine text-paper" : "border-line bg-card hover:border-pine/40",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium whitespace-nowrap lg:truncate lg:whitespace-normal">{athlete.name}</span>
                    <TrendMark tone={trend} inverted={active} />
                  </span>
                  <span className={cn("mt-1 hidden text-xs lg:block", active ? "text-paper/70" : "text-muted")}>
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
                    {mode === "osoba" ? selected?.name : data.groupName}
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    {mode === "osoba"
                      ? `${selected?.group || "Bez grupy"} · ${data.sessions.length} ${pluralSessions(data.sessions.length)}`
                      : "Porównanie wyników w wybranym kwartale"}
                  </p>
                </div>
                <div className="no-print inline-flex w-fit max-w-full self-start rounded-full border border-line bg-card p-1">
                  {(
                    [
                      ["osoba", "Osoba"],
                      ["grupa", "Grupa"],
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
                <GroupView
                  data={data}
                  sessionId={session.id}
                  onSession={setSessionId}
                  onOpenAthlete={(id) => {
                    setMode("osoba");
                    chooseAthlete(id);
                  }}
                />
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
  data: GroupBoard;
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
      <div className="sm:hidden">
        <PersonTable data={data} athleteId={athleteId} />
      </div>
      <div className="flex min-w-0 snap-x gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
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
                "w-40 shrink-0 snap-start rounded-3xl border p-4 text-left transition-colors sm:w-auto",
                active ? "border-pine bg-moss" : "border-line bg-card hover:border-pine/30",
              )}
            >
              <span className="block text-xs uppercase tracking-[0.14em] text-muted">{item.name}</span>
              <span className="mt-3 block font-serif text-3xl tabular-nums tracking-tight">
                {pair.latest ? formatValue(pair.latest.value, item.unit) : "—"}
                <span className="ml-1 font-sans text-sm text-muted">{item.unit}</span>
              </span>
              <span className={cn("mt-2 line-clamp-2 block text-xs", tone === "up" && "text-pine", tone === "down" && "text-clay", tone === "flat" && "text-muted")}>
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
        <QuarterList data={data} athleteId={athleteId} exercise={exercise} />
      </article>
      <div className="hidden sm:block print:block">
        <PersonTable data={data} athleteId={athleteId} />
      </div>
    </div>
  );
}

function GroupView({
  data,
  sessionId,
  onSession,
  onOpenAthlete,
}: {
  data: GroupBoard;
  sessionId: string;
  onSession: (id: string) => void;
  onOpenAthlete: (id: string) => void;
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
      <div className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[...data.sessions].reverse().map((item) => (
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
        <label className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center">
          Sortuj według
          <select
            value={sortExercise}
            onChange={(event) => setSortExercise(event.target.value)}
            className="h-11 w-full rounded-full border border-line bg-card px-3 text-base text-ink sm:h-10 sm:w-auto sm:text-sm"
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
      <ol className="flex flex-col gap-3 sm:hidden">
        {rows.map((athlete, index) => (
          <li key={athlete.id} className="rounded-3xl border border-line bg-card px-4 py-4">
            <button
              type="button"
              onClick={() => onOpenAthlete(athlete.id)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{athlete.name}</span>
                {exercise ? <span className="mt-0.5 block text-xs text-gold">Miejsce {index + 1}</span> : null}
              </span>
              <span className="shrink-0 text-xs font-medium text-pine">Przebieg</span>
            </button>
            <dl className="mt-3 flex flex-col">
              {data.exercises.map((item) => {
                const value = lookup(data, athlete.id, item.id, session.id);
                const sorting = item.id === sortExercise;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-baseline justify-between gap-3 border-t border-line/80 py-2.5 text-sm",
                      sorting && "-mx-2 rounded-xl bg-moss px-2",
                    )}
                  >
                    <dt className={cn("min-w-0 text-muted", sorting && "text-ink")}>{item.name}</dt>
                    <dd className="shrink-0 text-right font-medium tabular-nums">
                      {value === null ? <span className="font-normal text-muted">—</span> : `${formatValue(value, item.unit)} ${item.unit}`}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ol>
      <div className="min-w-0">
        <h2 className="mb-3 font-serif text-2xl tracking-tight sm:sr-only">Wszyscy razem</h2>
        <div className="overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-card print:block">
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
    </div>
  );
}

function PersonTable({ data, athleteId }: { data: GroupBoard; athleteId: string }) {
  return (
    <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-3xl border border-line bg-card">
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
  );
}

function ProgressChart({
  data,
  athleteId,
  exercise,
}: {
  data: GroupBoard;
  athleteId: string;
  exercise: GroupBoard["exercises"][number];
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
    <div className="mt-4 h-56 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 28, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#e4dccf" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#645f56", fontSize: 11 }}
            interval={0}
            axisLine={false}
            tickLine={false}
            tickFormatter={(label) => compactQuarter(String(label))}
          />
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
        Gdy administrator doda podopiecznych, ćwiczenia i pierwszy kwartał, wyniki tej grupy pojawią się tutaj.
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

function lookup(data: GroupBoard, athleteId: string, exerciseId: string, sessionId: string) {
  const result = data.results.find(
    (item) => item.athleteId === athleteId && item.exerciseId === exerciseId && item.sessionId === sessionId,
  );
  return result ? result.value : null;
}

function seriesEnds(data: GroupBoard, athleteId: string, exerciseId: string) {
  const points = data.sessions
    .map((session) => {
      const value = lookup(data, athleteId, exerciseId, session.id);
      return value === null ? null : { session, value };
    })
    .filter((point): point is { session: GroupBoard["sessions"][number]; value: number } => point !== null);
  return {
    latest: points.at(-1) ?? null,
    previous: points.length > 1 ? points[points.length - 2] : null,
  };
}

function athleteTrend(data: GroupBoard, athleteId: string) {
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

function QuarterList({
  data,
  athleteId,
  exercise,
}: {
  data: GroupBoard;
  athleteId: string;
  exercise: GroupBoard["exercises"][number];
}) {
  return (
    <ul className="mt-2 divide-y divide-line border-t border-line sm:hidden print:hidden">
      {data.sessions.map((session, index) => {
        const value = lookup(data, athleteId, exercise.id, session.id);
        const previousSession = data.sessions[index - 1];
        const previous = previousSession ? lookup(data, athleteId, exercise.id, previousSession.id) : null;
        const tone = value !== null && previous !== null ? scoreTone(value, previous, exercise.higherIsBetter) : "flat";
        const latest = index === data.sessions.length - 1;
        return (
          <li key={session.id} className={cn("flex items-baseline justify-between gap-3 py-3", latest && "font-medium")}>
            <span>
              <span className="block text-sm">{sessionLabel(session)}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted">{formatDate(session.testedAt)}</span>
            </span>
            <span className="text-right">
              <span className="block font-serif text-2xl tabular-nums tracking-tight">
                {value === null ? <span className="font-sans text-base font-normal text-muted">—</span> : formatValue(value, exercise.unit)}
              </span>
              {value !== null && previous !== null ? (
                <span className={cn("mt-0.5 block text-xs font-normal", tone === "up" && "text-pine", tone === "down" && "text-clay", tone === "flat" && "text-muted")}>
                  {formatDelta(value, previous, exercise.unit)} {exercise.unit}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function compactQuarter(label: string) {
  const match = /^(\d{4}) Q(\d)$/.exec(label);
  if (!match) return label;
  return `${match[1].slice(2)} Q${match[2]}`;
}

function pluralAthletes(count: number) {
  if (count === 1) return "osoba";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "osoby";
  return "osób";
}

function pluralSessions(count: number) {
  if (count === 1) return "pomiar";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "pomiary";
  return "pomiarów";
}
