import type { Metadata } from "next";
import TrackView from "@/components/pages/TrackView";

export const metadata: Metadata = { title: "Track Healing | DermShield" };

export default function Page() {
  return <TrackView />;
}
