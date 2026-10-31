import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "DermShield - Smart skin protection powered by YouCam Skin AI",
  description:
    "Check your skin, pause the harsh products that are hurting it, and only shop for gentle essentials once it has healed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <script dangerouslySetInnerHTML={{ __html: "if('scrollRestoration' in history)history.scrollRestoration='manual'" }} />
        {children}
      </body>
    </html>
  );
}
