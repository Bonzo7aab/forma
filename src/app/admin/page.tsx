import type { Metadata } from "next";
import { AdminStudio } from "@/components/admin-studio";

export const metadata: Metadata = {
  title: "Panel",
};

export default function AdminPage() {
  return <AdminStudio />;
}
