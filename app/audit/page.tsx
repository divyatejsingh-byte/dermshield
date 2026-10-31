import type { Metadata } from "next";
import AuditView from "@/components/pages/AuditView";

export const metadata: Metadata = { title: "Audit Products | DermShield" };

export default function Page() {
  return <AuditView />;
}
