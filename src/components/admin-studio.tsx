"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { Header } from "@/components/header";
import { Button, Field, Panel, SelectField, TextField } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  dateInputToUtc,
  directionCopy,
  errorText,
  formatDate,
  sessionLabel,
  utcToDateInput,
} from "@/lib/format";
import type { ChangePasswordResult } from "@convex-dev/auth/methods/username-password/server";
import { DEFAULT_MIN_PASSWORD_LENGTH } from "@convex-dev/auth/methods/username-password";

type Tab = "wyniki" | "sklad" | "cwiczenia" | "konto";

export function AdminStudio() {
  const viewer = useQuery(api.currentUser.viewer);
  const overview = useQuery(api.board.overview);
  const [tab, setTab] = useState<Tab>("wyniki");
  const hasSamples = overview?.athletes.some((athlete) => athlete.sample) ?? false;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Administrator</p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight">Prowadzenie testów</h1>
            <p className="mt-2 text-sm text-muted">
              {viewer ? `Zalogowano jako ${viewer.username}.` : "Sprawdzanie sesji…"} Zmiany są od razu widoczne na stronie publicznej.
            </p>
          </div>
          <div className="no-print inline-flex flex-wrap rounded-full border border-line bg-card p-1">
            {(
              [
                ["wyniki", "Wyniki"],
                ["sklad", "Podopieczni"],
                ["cwiczenia", "Ćwiczenia"],
                ["konto", "Konto"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn("h-9 rounded-full px-4 text-sm", tab === value ? "bg-pine text-paper" : "text-muted")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {hasSamples ? <SampleBanner /> : null}
        {overview === undefined ? (
          <div className="h-80 animate-pulse rounded-3xl bg-card" />
        ) : tab === "wyniki" ? (
          <ResultsEditor overview={overview} />
        ) : tab === "sklad" ? (
          <RosterEditor />
        ) : tab === "cwiczenia" ? (
          <ExerciseEditor />
        ) : (
          <AccountPanel username={viewer?.username ?? ""} />
        )}
      </main>
    </div>
  );
}

function SampleBanner() {
  const clearSamples = useMutation(api.seed.clearSamples);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col justify-between gap-3 rounded-3xl bg-gold-soft px-5 py-4 sm:flex-row sm:items-center">
      <p className="text-sm text-gold">Na liście są przykładowe osoby i pomiary. Usuń je przed własną grupą. Ćwiczenia zostaną.</p>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await clearSamples({});
          } catch (cause) {
            setError(errorText(cause));
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Usuwanie…" : "Usuń dane przykładowe"}
      </Button>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
    </div>
  );
}

type Overview = FunctionReturnType<typeof api.board.overview>;

function ResultsEditor({ overview }: { overview: Overview }) {
  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);
  const removeSession = useMutation(api.sessions.remove);
  const saveResults = useMutation(api.results.saveForSession);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [trackedSession, setTrackedSession] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const session = overview.sessions.find((item) => item.id === sessionId) ?? overview.sessions.at(-1) ?? null;
  const activeSessionId = session?.id ?? null;
  if (activeSessionId !== trackedSession) {
    setTrackedSession(activeSessionId);
    setEdits({});
  }

  const baseline = useMemo(() => {
    if (!session) return {};
    return buildDraft(overview, session.id);
  }, [overview, session]);
  const dirty = Object.keys(edits).length > 0;

  function cellValue(athleteId: string, exerciseId: string) {
    const key = `${athleteId}:${exerciseId}`;
    if (key in edits) return edits[key];
    return baseline[athleteId]?.[exerciseId] ?? "";
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const id = await createSession({
        year: Number(form.get("year")),
        quarter: Number(form.get("quarter")) as 1 | 2 | 3 | 4,
        testedAt: dateInputToUtc(String(form.get("date"))),
        note: String(form.get("note") ?? ""),
      });
      setSessionId(id);
      setCreating(false);
      setEdits({});
      setStatus("Dodano kwartał.");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setPending(false);
    }
  }

  async function onSaveSessionMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await updateSession({
        sessionId: session.id as Id<"sessions">,
        testedAt: dateInputToUtc(String(form.get("date"))),
        note: String(form.get("note") ?? ""),
      });
      setStatus("Zapisano datę kwartału.");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setPending(false);
    }
  }

  async function onSaveGrid() {
    if (!session) return;
    setPending(true);
    setError(null);
    try {
      const entries = [];
      for (const athlete of overview.athletes) {
        for (const exercise of overview.exercises) {
          const raw = cellValue(athlete.id, exercise.id);
          entries.push({
            athleteId: athlete.id as Id<"athletes">,
            exerciseId: exercise.id as Id<"exercises">,
            value: parseScore(raw, athlete.name, exercise.name),
          });
        }
      }
      await saveResults({ sessionId: session.id as Id<"sessions">, entries });
      setEdits({});
      setStatus("Zapisano wyniki kwartału.");
    } catch (cause) {
      setError(cause instanceof Error && cause.message.startsWith("Wynik") ? cause.message : errorText(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {overview.sessions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSessionId(item.id);
              setConfirmDelete(false);
              setStatus(null);
            }}
            className={cn(
              "h-10 rounded-full px-4 text-sm",
              session?.id === item.id ? "bg-ink text-paper" : "bg-card text-muted",
            )}
          >
            {sessionLabel(item)}
          </button>
        ))}
        <Button variant="secondary" onClick={() => setCreating((value) => !value)}>
          {creating ? "Anuluj" : "Nowy kwartał"}
        </Button>
      </div>
      {creating ? (
        <Panel>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-4">
            <Field label="Rok">
              <TextField name="year" type="number" min={2000} max={2100} defaultValue={2026} required />
            </Field>
            <Field label="Kwartał">
              <SelectField name="quarter" defaultValue="4">
                <option value="1">Q1</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </SelectField>
            </Field>
            <Field label="Data testu">
              <TextField name="date" type="date" defaultValue="2026-11-27" required />
            </Field>
            <Field label="Notatka">
              <TextField name="note" placeholder="Opcjonalnie" />
            </Field>
            <div className="md:col-span-4">
              <Button type="submit" disabled={pending}>Dodaj kwartał</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {session ? (
        <>
          <Panel>
            <form onSubmit={onSaveSessionMeta} className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
              <Field label="Data testu">
                <TextField name="date" type="date" defaultValue={utcToDateInput(session.testedAt)} key={session.id} required />
              </Field>
              <Field label="Notatka">
                <TextField name="note" defaultValue={session.note} key={`${session.id}-note`} placeholder="Opcjonalnie" />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="secondary" disabled={pending}>Zapisz opis</Button>
                {confirmDelete ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      try {
                        await removeSession({ sessionId: session.id as Id<"sessions"> });
                        setSessionId(null);
                        setConfirmDelete(false);
                        setStatus("Usunięto kwartał wraz z wynikami.");
                      } catch (cause) {
                        setError(errorText(cause));
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    Potwierdź usunięcie
                  </Button>
                ) : (
                  <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
                    Usuń kwartał
                  </Button>
                )}
              </div>
            </form>
            <p className="mt-3 text-xs text-muted">{formatDate(session.testedAt)} · puste pole usuwa wynik tej osoby w tym ćwiczeniu.</p>
          </Panel>
          {overview.athletes.length === 0 || overview.exercises.length === 0 ? (
            <Panel>
              <p className="text-sm text-muted">Najpierw dodaj podopiecznych i ćwiczenia. Potem wpiszesz wyniki w tabeli.</p>
            </Panel>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-line bg-card">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-[0.14em] text-muted">
                    <th className="sticky left-0 bg-card px-4 py-3 font-medium">Osoba</th>
                    {overview.exercises.map((exercise) => (
                      <th key={exercise.id} className="px-3 py-3 font-medium">
                        {exercise.name}
                        <span className="mt-1 block normal-case tracking-normal">{exercise.unit}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.athletes.map((athlete) => (
                    <tr key={athlete.id} className="border-b border-line/70 last:border-0">
                      <th className="sticky left-0 bg-card px-4 py-2 text-left">
                        <span className="block font-medium">{athlete.name}</span>
                        <span className="text-xs font-normal text-muted">{athlete.group || "Bez grupy"}</span>
                      </th>
                      {overview.exercises.map((exercise) => (
                        <td key={exercise.id} className="px-3 py-2">
                          <input
                            inputMode="decimal"
                            aria-label={`${athlete.name}, ${exercise.name}`}
                            value={cellValue(athlete.id, exercise.id)}
                            onChange={(event) => {
                              const key = `${athlete.id}:${exercise.id}`;
                              const value = event.target.value;
                              setEdits((current) => ({ ...current, [key]: value }));
                            }}
                            className="h-10 w-24 rounded-xl border border-line bg-paper px-2 tabular-nums outline-none focus:border-pine"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="sticky bottom-4 flex flex-col justify-between gap-3 rounded-3xl border border-line bg-card/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center">
            <p className="text-sm text-muted">{error ?? status ?? (dirty ? "Masz niezapisane wyniki." : "Wyniki są zapisane.")}</p>
            <Button onClick={onSaveGrid} disabled={!dirty || pending || overview.athletes.length === 0}>
              {pending ? "Zapisywanie…" : "Zapisz wyniki"}
            </Button>
          </div>
        </>
      ) : (
        <Panel>
          <p className="text-sm text-muted">Dodaj pierwszy kwartał, a potem wpisz wyniki w tabeli.</p>
        </Panel>
      )}
    </div>
  );
}

function RosterEditor() {
  const athletes = useQuery(api.athletes.listManage);
  const createAthlete = useMutation(api.athletes.create);
  const updateAthlete = useMutation(api.athletes.update);
  const setActive = useMutation(api.athletes.setActive);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await createAthlete({ name: String(form.get("name") ?? ""), group: String(form.get("group") ?? "") });
      event.currentTarget.reset();
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel>
        <h2 className="font-serif text-2xl">Nowa osoba</h2>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-4">
          <Field label="Imię i nazwisko">
            <TextField name="name" required minLength={2} />
          </Field>
          <Field label="Grupa" hint="Na przykład U16 albo Senior.">
            <TextField name="group" />
          </Field>
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <Button type="submit">Dodaj podopiecznego</Button>
        </form>
      </Panel>
      <Panel>
        {athletes === undefined ? (
          <div className="h-40 animate-pulse rounded-2xl bg-paper" />
        ) : athletes.length === 0 ? (
          <p className="text-sm text-muted">Lista jest pusta. Dodaj pierwszą osobę albo wczytaj przykład w zakładce Konto.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {athletes.map((athlete) => (
              <li key={athlete.id} className="rounded-2xl border border-line px-4 py-3">
                {editing === athlete.id ? (
                  <form
                    className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      try {
                        await updateAthlete({
                          athleteId: athlete.id as Id<"athletes">,
                          name: String(form.get("name") ?? ""),
                          group: String(form.get("group") ?? ""),
                        });
                        setEditing(null);
                        setError(null);
                      } catch (cause) {
                        setError(errorText(cause));
                      }
                    }}
                  >
                    <TextField name="name" defaultValue={athlete.name} required />
                    <TextField name="group" defaultValue={athlete.group} />
                    <Button type="submit">Zapisz</Button>
                  </form>
                ) : (
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium">
                        {athlete.name}
                        {!athlete.active ? <span className="ml-2 text-xs text-muted">ukryta</span> : null}
                        {athlete.sample ? <span className="ml-2 text-xs text-gold">przykład</span> : null}
                      </p>
                      <p className="text-sm text-muted">{athlete.group || "Bez grupy"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setEditing(athlete.id)}>Edytuj</Button>
                      <Button
                        variant="ghost"
                        onClick={() => setActive({ athleteId: athlete.id as Id<"athletes">, active: !athlete.active })}
                      >
                        {athlete.active ? "Ukryj" : "Przywróć"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ExerciseEditor() {
  const exercises = useQuery(api.exercises.listManage);
  const createExercise = useMutation(api.exercises.create);
  const updateExercise = useMutation(api.exercises.update);
  const setActive = useMutation(api.exercises.setActive);
  const moveExercise = useMutation(api.exercises.move);
  const removeExercise = useMutation(api.exercises.remove);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await createExercise({
        name: String(form.get("name") ?? ""),
        unit: String(form.get("unit") ?? ""),
        higherIsBetter: form.get("higherIsBetter") === "on",
      });
      event.currentTarget.reset();
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel>
        <h2 className="font-serif text-2xl">Nowe ćwiczenie</h2>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-4">
          <Field label="Nazwa">
            <TextField name="name" required placeholder="Bieg 30 m" />
          </Field>
          <Field label="Jednostka" hint="Na przykład s, cm, m, powt., poziom.">
            <TextField name="unit" required placeholder="s" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input name="higherIsBetter" type="checkbox" defaultChecked className="size-4 accent-pine" />
            Wyższy wynik jest lepszy
          </label>
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <Button type="submit">Dodaj ćwiczenie</Button>
        </form>
      </Panel>
      <Panel>
        {exercises === undefined ? (
          <div className="h-40 animate-pulse rounded-2xl bg-paper" />
        ) : (
          <ul className="flex flex-col gap-3">
            {exercises.map((exercise, index) => (
              <li key={exercise.id} className="rounded-2xl border border-line px-4 py-3">
                {editing === exercise.id ? (
                  <form
                    className="grid gap-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      try {
                        await updateExercise({
                          exerciseId: exercise.id as Id<"exercises">,
                          name: String(form.get("name") ?? ""),
                          unit: String(form.get("unit") ?? ""),
                          higherIsBetter: form.get("higherIsBetter") === "on",
                        });
                        setEditing(null);
                      } catch (cause) {
                        setError(errorText(cause));
                      }
                    }}
                  >
                    <TextField name="name" defaultValue={exercise.name} required />
                    <TextField name="unit" defaultValue={exercise.unit} required />
                    <label className="flex items-center gap-2 text-sm">
                      <input name="higherIsBetter" type="checkbox" defaultChecked={exercise.higherIsBetter} className="size-4 accent-pine" />
                      Wyższy wynik jest lepszy
                    </label>
                    <Button type="submit">Zapisz</Button>
                  </form>
                ) : (
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium">
                        {exercise.name}
                        {!exercise.active ? <span className="ml-2 text-xs text-muted">ukryte</span> : null}
                      </p>
                      <p className="text-sm text-muted">
                        {exercise.unit} · {directionCopy(exercise.higherIsBetter)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="ghost" disabled={index === 0} onClick={() => moveExercise({ exerciseId: exercise.id as Id<"exercises">, direction: "up" })}>
                        Wyżej
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={index === exercises.length - 1}
                        onClick={() => moveExercise({ exerciseId: exercise.id as Id<"exercises">, direction: "down" })}
                      >
                        Niżej
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(exercise.id)}>Edytuj</Button>
                      <Button variant="ghost" onClick={() => setActive({ exerciseId: exercise.id as Id<"exercises">, active: !exercise.active })}>
                        {exercise.active ? "Ukryj" : "Przywróć"}
                      </Button>
                      {confirmId === exercise.id ? (
                        <Button
                          variant="danger"
                          onClick={async () => {
                            await removeExercise({ exerciseId: exercise.id as Id<"exercises"> });
                            setConfirmId(null);
                          }}
                        >
                          Potwierdź
                        </Button>
                      ) : (
                        <Button variant="danger" onClick={() => setConfirmId(exercise.id)}>Usuń</Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function AccountPanel({ username }: { username: string }) {
  const overview = useQuery(api.board.overview);
  const loadSamples = useMutation(api.seed.loadForAdmin);
  const changePassword = useMutation(api.auth.changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const empty = overview !== undefined && overview.athletes.length === 0 && overview.sessions.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h2 className="font-serif text-2xl">Hasło</h2>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setStatus(null);
            try {
              const result = await changePassword({
                currentPassword,
                newPassword,
                signOutOtherSessions: true,
              });
              if (result.success) {
                setCurrentPassword("");
                setNewPassword("");
                setStatus("Hasło zostało zmienione. Inne urządzenia zostały wylogowane.");
              } else {
                setStatus(passwordError(result.userError));
              }
            } catch (cause) {
              setStatus(errorText(cause));
            } finally {
              setPending(false);
            }
          }}
        >
          <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
          <Field label="Obecne hasło">
            <TextField
              id="current-password"
              name="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </Field>
          <Field label="Nowe hasło" hint={`Minimum ${DEFAULT_MIN_PASSWORD_LENGTH} znaków.`}>
            <TextField
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              minLength={DEFAULT_MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </Field>
          {status ? <p className="text-sm text-muted">{status}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Zmieniam…" : "Zmień hasło"}</Button>
        </form>
      </Panel>
      <Panel>
        <h2 className="font-serif text-2xl">Dane przykładowe</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Dwanaście osób, pięć ćwiczeń i sześć kwartałów od 2025 Q1 do 2026 Q2. Wczytanie działa tylko na pustej liście osób i kwartałów.
        </p>
        <Button
          className="mt-5"
          variant="secondary"
          disabled={!empty || pending}
          onClick={async () => {
            setPending(true);
            setStatus(null);
            try {
              const result = await loadSamples({});
              setStatus(result.seeded ? `Wczytano ${result.athletes} osób i ${result.results} wyników.` : "Przykład można wczytać tylko, gdy nie ma jeszcze osób ani kwartałów.");
            } catch (cause) {
              setStatus(errorText(cause));
            } finally {
              setPending(false);
            }
          }}
        >
          Wczytaj dane przykładowe
        </Button>
      </Panel>
    </div>
  );
}

function buildDraft(
  overview: { athletes: Array<{ id: string }>; exercises: Array<{ id: string }>; results: Array<{ sessionId: string; athleteId: string; exerciseId: string; value: number }> },
  sessionId: string,
) {
  const draft: Record<string, Record<string, string>> = {};
  for (const athlete of overview.athletes) {
    draft[athlete.id] = {};
    for (const exercise of overview.exercises) {
      const found = overview.results.find(
        (result) => result.sessionId === sessionId && result.athleteId === athlete.id && result.exerciseId === exercise.id,
      );
      draft[athlete.id][exercise.id] = found ? String(found.value) : "";
    }
  }
  return draft;
}

function parseScore(raw: string, athlete: string, exercise: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 100000) {
    throw new Error(`Wynik „${exercise}” dla ${athlete} musi być liczbą większą od zera.`);
  }
  return value;
}

function passwordError(userError: Extract<ChangePasswordResult, { success: false }>["userError"]) {
  switch (userError.error) {
    case "INVALID_CREDENTIALS":
      return "Obecne hasło jest nieprawidłowe.";
    case "RATE_LIMITED":
      return `Za dużo prób. Odczekaj ${Math.ceil(userError.retryAfterMs / 1000)} s.`;
    case "PASSWORD_TOO_SHORT":
      return `Nowe hasło musi mieć co najmniej ${userError.minimumLength} znaków.`;
    case "PASSWORD_TOO_LONG":
      return `Nowe hasło może mieć najwyżej ${userError.maximumLength} znaków.`;
    case "PASSWORD_HAS_SURROUNDING_WHITESPACE":
      return "Nowe hasło nie może zaczynać ani kończyć się spacją.";
    case "PASSWORD_TOO_COMMON":
      return "Nowe hasło jest zbyt popularne.";
    case "NOT_LOGGED_IN":
      return "Sesja wygasła. Zaloguj się ponownie.";
    default: {
      const unreachable: never = userError;
      return `Nieznany błąd: ${JSON.stringify(unreachable)}`;
    }
  }
}
