import { Suspense } from "react";
import { Board } from "@/components/board";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <Board />
    </Suspense>
  );
}
