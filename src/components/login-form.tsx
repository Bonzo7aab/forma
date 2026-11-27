"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignInWithUsernamePassword } from "@convex-dev/auth/methods/username-password/react";
import { DEFAULT_MIN_PASSWORD_LENGTH } from "@convex-dev/auth/methods/username-password";
import { api } from "@convex/_generated/api";
import { Logo } from "@/components/logo";
import { Button, Field, TextField } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const { signIn, pending } = useSignInWithUsernamePassword(api.auth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const result = await signIn({ username, password });
    if (result.status === "complete") {
      router.push("/admin");
      router.refresh();
      return;
    }
    setError(messageFor(result.userError));
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between bg-pine px-6 py-8 text-paper sm:px-10 lg:px-14 lg:py-12">
        <Logo tone="paper" />
        <div className="max-w-xl py-12">
          <p className="text-xs uppercase tracking-[0.22em] text-paper/60">Kwartalne testy</p>
          <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl">
            Cztery pomiary w roku. Wyraźny obraz rozwoju.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-paper/75">
            Wyniki i zapisy są dostępne dopiero po zalogowaniu administratora.
          </p>
        </div>
        <p className="text-sm text-paper/60">5 ćwiczeń · kolejne kwartały · jedna oś czasu</p>
      </section>
      <section className="flex items-center bg-paper px-6 py-12">
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-5">
          <div>
            <h2 className="font-serif text-3xl tracking-tight">Panel administratora</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Zaloguj się, aby zobaczyć tablicę i wpisać wyniki kolejnego kwartału.
            </p>
          </div>
          <Field label="Login" hint="Może wyglądać jak e-mail. Minimum jeden znak, bez spacji na brzegach.">
            <TextField
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              disabled={pending}
            />
          </Field>
          <Field label="Hasło" hint={`Minimum ${DEFAULT_MIN_PASSWORD_LENGTH} znaków.`}>
            <TextField
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={DEFAULT_MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={pending}
            />
          </Field>
          {error ? (
            <p role="alert" className="rounded-2xl bg-clay-soft px-3 py-2 text-sm text-clay">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Chwileczkę…" : "Zaloguj się"}
          </Button>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Wróć do wyników
          </Link>
        </form>
      </section>
    </div>
  );
}

function messageFor(userError: { error: string; retryAfterMs?: number; cause?: unknown }) {
  switch (userError.error) {
    case "USER_NOT_FOUND":
    case "INVALID_CREDENTIALS":
      return "Nieprawidłowy login albo hasło.";
    case "RATE_LIMITED":
      return `Za dużo prób. Odczekaj ${Math.ceil((userError.retryAfterMs ?? 1000) / 1000)} s.`;
    default:
      if (userError.cause !== undefined) {
        console.error("Logowanie nie powiodło się:", userError.cause);
      }
      return "Nie udało się zalogować. Spróbuj ponownie.";
  }
}
