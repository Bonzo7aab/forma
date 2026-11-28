"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Board } from "@/components/board";
import { Header } from "@/components/header";
import { Panel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { errorText } from "@/lib/format";

const tokenKey = "forma-group-token";
const tokenEvent = "forma-group-token-change";

function readToken() {
  return sessionStorage.getItem(tokenKey);
}

function writeToken(token: string | null) {
  if (token) sessionStorage.setItem(tokenKey, token);
  else sessionStorage.removeItem(tokenKey);
  window.dispatchEvent(new Event(tokenEvent));
}

function subscribe(callback: () => void) {
  window.addEventListener(tokenEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(tokenEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function GroupHome() {
  const token = useSyncExternalStore(subscribe, readToken, () => null);
  if (token) return <Board token={token} onLeave={() => writeToken(null)} />;
  return <GroupGate onUnlock={writeToken} />;
}

function GroupGate({ onUnlock }: { onUnlock: (token: string) => void }) {
  const groups = useQuery(api.groups.listPublic);
  const unlock = useMutation(api.groups.unlock);
  const [selected, setSelected] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const chosen = groups?.find((group) => group.name === selected) ?? null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen) return;
    setPending(true);
    setError(null);
    try {
      const result = await unlock({ name: chosen.name, password });
      setPassword("");
      onUnlock(result.token);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top_left,var(--moss)_0%,transparent_58%),radial-gradient(ellipse_at_top_right,var(--gold-soft)_0%,transparent_46%)]"
          />
          <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Cztery kwartały</p>
            <h1 className="mt-5 max-w-xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
              Wybierz grupę
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">
              Statystyki otwierają się po haśle grupy. Widać wtedy tylko osoby z tej grupy.
            </p>

            <div className="mt-14">
              {groups === undefined ? (
                <div className="h-40 animate-pulse rounded-3xl bg-card" />
              ) : groups.length === 0 ? (
                <Panel>
                  <p className="text-sm text-muted">Administrator nie dodał jeszcze żadnej grupy.</p>
                </Panel>
              ) : (
                <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.name}
                      name={group.name}
                      hasPassword={group.hasPassword}
                      open={selected === group.name}
                      enterDelay={replacing && selected === group.name ? 130 : 16}
                      password={password}
                      error={selected === group.name ? error : null}
                      pending={pending && selected === group.name}
                      onSelect={() => {
                        setReplacing(selected !== null && selected !== group.name);
                        setSelected(selected === group.name ? null : group.name);
                        setPassword("");
                        setError(null);
                      }}
                      onPassword={setPassword}
                      onSubmit={onSubmit}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function GroupCard({
  name,
  hasPassword,
  open,
  enterDelay,
  password,
  error,
  pending,
  onSelect,
  onPassword,
  onSubmit,
}: {
  name: string;
  hasPassword: boolean;
  open: boolean;
  enterDelay: number;
  password: string;
  error: string | null;
  pending: boolean;
  onSelect: () => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [present, setPresent] = useState(false);
  const [shown, setShown] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = window.setTimeout(() => setShown(true), enterDelay);
      return () => window.clearTimeout(frame);
    }
    setShown(false);
    const frame = window.setTimeout(() => setPresent(false), 260);
    return () => window.clearTimeout(frame);
  }, [enterDelay, open]);

  useEffect(() => {
    if (shown && hasPassword) field.current?.focus({ preventScroll: true });
  }, [hasPassword, shown]);

  return (
    <div
      className={cn(
        "rounded-3xl border transition-[background-color,border-color,color] duration-200 ease-out motion-reduce:transition-none",
        open ? "border-pine bg-pine text-paper" : "border-line bg-card/90 hover:border-pine/40",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onSelect}
        className="w-full rounded-3xl px-5 py-6 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
      >
        <span className="block font-serif text-3xl tracking-tight">{name}</span>
      </button>
      <div className="group-panel" data-open={shown ? "true" : "false"} inert={shown ? undefined : true}>
        <div className="min-h-0 overflow-hidden">
          {present ? (
            hasPassword ? (
              <form onSubmit={onSubmit} className="group-panel-body flex flex-col gap-3 px-5 pb-5">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-paper/70">
                  Hasło
                  <input
                    ref={field}
                    type="password"
                    name="group-password"
                    autoComplete="off"
                    enterKeyHint="go"
                    value={password}
                    onChange={(event) => onPassword(event.target.value)}
                    required
                    minLength={4}
                    placeholder="Hasło grupy"
                    className="mt-2 h-12 w-full rounded-xl border border-transparent bg-paper px-3 text-base text-ink outline-none placeholder:text-muted/70 focus:border-gold"
                  />
                </label>
                {error ? (
                  <p role="alert" className="rounded-xl bg-paper px-3 py-2 text-sm text-clay">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={pending || !open}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-paper text-sm font-medium text-pine outline-none hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper disabled:opacity-50"
                >
                  {pending ? "Sprawdzanie…" : "Pokaż statystyki"}
                </button>
              </form>
            ) : (
              <p className="group-panel-body px-5 pb-5 text-sm leading-6 text-paper/80">
                Administrator nie ustawił jeszcze hasła tej grupy.
              </p>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
