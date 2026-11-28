"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignInWithUsernamePassword, useSignUpWithUsernamePassword } from "@convex-dev/auth/methods/username-password/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Logo } from "@/components/logo";
import { Button, Field, TextField } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const registrationOpen = useQuery(api.currentUser.registrationOpen);
  const { signIn, pending: signingIn } = useSignInWithUsernamePassword(api.auth);
  const { signUp, pending: signingUp } = useSignUpWithUsernamePassword(api.auth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = signingIn || signingUp;
  const creating = registrationOpen === true;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const result = creating
      ? await signUp({ username, password })
      : await signIn({ username, password });
    if (result.status === "complete") {
      router.push("/admin");
      router.refresh();
      return;
    }
    setError(messageFor(result.userError, creating));
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
            Goście oglądają wyniki. Zapisywać pomiary, osoby i ćwiczenia może tylko administrator.
          </p>
        </div>
        <p className="text-sm text-paper/60">5 ćwiczeń · kolejne kwartały · jedna oś czasu</p>
      </section>
      <section className="flex items-center bg-paper px-6 py-12">
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-5">
          <div>
            <h2 className="font-serif text-3xl tracking-tight">
              {registrationOpen === undefined ? "Logowanie" : creating ? "Pierwsze konto" : "Panel administratora"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {creating
                ? "To konto powstaje tylko raz. Potem rejestracja jest zamknięta."
                : "Zaloguj się, aby wpisać wyniki kolejnego kwartału."}
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
              disabled={pending || registrationOpen === undefined}
            />
          </Field>
          <Field label="Hasło" hint="Minimum 4 znaki.">
            <TextField
              id="password"
              name="password"
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              minLength={4}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={pending || registrationOpen === undefined}
            />
          </Field>
          {error ? (
            <p role="alert" className="rounded-2xl bg-clay-soft px-3 py-2 text-sm text-clay">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending || registrationOpen === undefined}>
            {pending ? "Chwileczkę…" : creating ? "Utwórz konto administratora" : "Zaloguj się"}
          </Button>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Wróć do wyników
          </Link>
        </form>
      </section>
    </div>
  );
}

function messageFor(
  userError:
    | { error: "USERNAME_TAKEN" }
    | { error: "USERNAME_TOO_SHORT"; minimumLength: number }
    | { error: "USERNAME_TOO_LONG"; maximumLength: number }
    | { error: "USERNAME_HAS_SURROUNDING_WHITESPACE" }
    | { error: "USERNAME_HAS_INVALID_CHARACTERS" }
    | { error: "PASSWORD_TOO_SHORT"; minimumLength: number }
    | { error: "PASSWORD_TOO_LONG"; maximumLength: number }
    | { error: "PASSWORD_HAS_SURROUNDING_WHITESPACE" }
    | { error: "PASSWORD_TOO_COMMON" }
    | { error: "USER_NOT_FOUND" }
    | { error: "INVALID_CREDENTIALS" }
    | { error: "RATE_LIMITED"; retryAfterMs: number }
    | { error: "OTHER_ERROR"; cause: unknown },
  creating: boolean,
) {
  switch (userError.error) {
    case "USERNAME_TAKEN":
      return "Ten login jest już zajęty.";
    case "USERNAME_TOO_SHORT":
      return `Login musi mieć co najmniej ${userError.minimumLength} znaków.`;
    case "USERNAME_TOO_LONG":
      return `Login może mieć najwyżej ${userError.maximumLength} znaków.`;
    case "USERNAME_HAS_SURROUNDING_WHITESPACE":
      return "Login nie może zaczynać ani kończyć się spacją.";
    case "USERNAME_HAS_INVALID_CHARACTERS":
      return "Login zawiera niedozwolone znaki.";
    case "PASSWORD_TOO_SHORT":
      return `Hasło musi mieć co najmniej ${userError.minimumLength} znaków.`;
    case "PASSWORD_TOO_LONG":
      return `Hasło może mieć najwyżej ${userError.maximumLength} znaków.`;
    case "PASSWORD_HAS_SURROUNDING_WHITESPACE":
      return "Hasło nie może zaczynać ani kończyć się spacją.";
    case "PASSWORD_TOO_COMMON":
      return "To hasło jest zbyt popularne. Wybierz inne.";
    case "USER_NOT_FOUND":
    case "INVALID_CREDENTIALS":
      return "Nieprawidłowy login albo hasło.";
    case "RATE_LIMITED":
      return `Za dużo prób. Odczekaj ${Math.ceil(userError.retryAfterMs / 1000)} s.`;
    case "OTHER_ERROR":
      console.error(creating ? "Rejestracja nie powiodła się:" : "Logowanie nie powiodło się:", userError.cause);
      return creating
        ? "Nie udało się utworzyć konta. Jeśli administrator już istnieje, zaloguj się."
        : "Nie udało się zalogować. Spróbuj ponownie.";
    default: {
      const unreachable: never = userError;
      console.error(unreachable);
      return "Coś poszło nie tak.";
    }
  }
}
