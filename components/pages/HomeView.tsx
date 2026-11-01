"use client";

import Close from "../landing/Close";
import Dashboard from "../Dashboard";
import ProgressHistory from "../landing/ProgressHistory";
import Statement from "../landing/Statement";
import ToolPreviews from "../landing/ToolPreviews";
import { useSkin } from "@/context/SkinContext";

/** Landing page for visitors; a dashboard (with the same tool shortcuts) once signed in or in demo. */
export default function HomeView({ hero }: { hero: React.ReactNode }) {
  const { authed, guest, firstName, scans, scansLoaded, userId, clearHistory } = useSkin();

  if (authed) {
    return (
      <>
        <Dashboard name={firstName} guest={guest} scans={scans} loaded={scansLoaded} />
        <ProgressHistory scans={scans} signedIn={!!userId} onClear={clearHistory} />
        <ToolPreviews title="Jump back in" />
      </>
    );
  }

  return (
    <>
      {hero}
      <Statement />
      <ToolPreviews />
      <Close />
    </>
  );
}
