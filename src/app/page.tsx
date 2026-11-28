import { Suspense } from "react";
import { GroupHome } from "@/components/group-home";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <GroupHome />
    </Suspense>
  );
}
