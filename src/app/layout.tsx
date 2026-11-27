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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Suspense fallback={<div className="min-h-screen bg-paper" />}>
          <ConvexAuthNextjsServerProvider>{children}</ConvexAuthNextjsServerProvider>
        </Suspense>
      </body>
    </html>
  );
}
