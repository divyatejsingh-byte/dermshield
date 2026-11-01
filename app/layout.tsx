import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SkinProvider } from "@/context/SkinContext";
import Footer from "@/components/Footer";
import Nav from "@/components/landing/Nav";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["SOFT"] });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "DermShield - Smart skin protection powered by YouCam Skin AI",
  description:
    "Check your skin, pause the harsh products that are hurting it, and only shop for gentle essentials once it has healed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('scrollRestoration' in history)history.scrollRestoration='manual';try{var t=localStorage.getItem('dermshield_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}",
          }}
        />
        <SkinProvider>
          <div className="min-h-screen overflow-x-clip">
            <Nav />
            {children}
            <Footer />
          </div>
        </SkinProvider>
      </body>
    </html>
  );
}
