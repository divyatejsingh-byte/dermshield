import type { Metadata } from "next";
import ScanView from "@/components/pages/ScanView";

export const metadata: Metadata = { title: "Check My Skin | DermShield" };

export default function Page() {
  return <ScanView />;
}
