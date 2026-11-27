import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Suspense } from "react";
import { ConvexAuthNextjsServerProvider } from "@/lib/convexAuth";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "Forma — testy sprawności",
    template: "%s · Forma",
  },
  description: "Kwartalne testy sprawności i postęp podopiecznych na przestrzeni kolejnych pomiarów.",
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
};

const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        {convexConfigured ? (
          <Suspense fallback={<div className="min-h-screen bg-paper" />}>
            <ConvexAuthNextjsServerProvider>{children}</ConvexAuthNextjsServerProvider>
          </Suspense>
        ) : (
          <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Forma</p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight">Baza nie jest podłączona.</h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Ustaw adres wdrożenia Convex w zmiennej CONVEX_URL, a potem opublikuj aplikację ponownie.
            </p>
          </main>
        )}
      </body>
    </html>
  );
}
