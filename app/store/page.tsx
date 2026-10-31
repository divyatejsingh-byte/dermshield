import type { Metadata } from "next";
import StoreView from "@/components/pages/StoreView";

export const metadata: Metadata = { title: "Safe Store | DermShield" };

export default function Page() {
  return <StoreView />;
}
