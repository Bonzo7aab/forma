"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";

export function Header({ onChangeGroup }: { onChangeGroup?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const viewer = useQuery(api.currentUser.viewer);
  const { signOut } = useAuthActions();
  const onAdmin = pathname.startsWith("/admin");

  return (
    <header className="no-print sticky top-0 z-20 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:min-h-16 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
        <Logo compact />
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {onChangeGroup ? (
            <Button className="px-3 sm:px-4" onClick={onChangeGroup}>
              Zmień grupę
            </Button>
          ) : null}
          {viewer ? (
            <>
              {onAdmin ? (
                <Link href="/" className="hidden text-sm text-muted hover:text-ink sm:inline">
                  Podgląd publiczny
                </Link>
              ) : (
                <Link href="/admin" className="hidden text-sm text-muted hover:text-ink sm:inline">
                  Panel
                </Link>
              )}
              <Button
                variant="secondary"
                className="px-3 sm:px-4"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                  router.refresh();
                }}
              >
                Wyloguj
              </Button>
            </>
          ) : (
            <Link
              href="/logowanie"
              className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-card px-3 text-sm font-medium text-ink outline-none hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine sm:px-4"
            >
              Logowanie
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
