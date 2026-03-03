import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { getServerSession } from "next-auth/next";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/layout/Navbar";
import MainContent from "@/components/MainContent";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

// ── MASTER.md §3: Space Grotesk (heading) + DM Sans (body) ──────────────────
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
  display: "swap",
});

// ── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "PonyMind",
    template: "%s · PonyMind",
  },
  description: "AI 驱动的知识问答社区 — 分享、提问、成长",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
};

// ── Root Layout ───────────────────────────────────────────────────────────────
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html
      lang="zh"
      suppressHydrationWarning
      // MASTER §3: inject both font CSS variables onto <html>
      className={`${spaceGrotesk.variable} ${dmSans.variable}`}
    >
      <body
        // font-sans → DM Sans (via --font-dm-sans in @theme inline)
        // antialiased → 亞像素字體平滑
        className="font-sans bg-background text-foreground antialiased"
      >
        {/*
          ── Skip Link — MASTER.md §11 Accessibility ────────────────────────
          隱藏直到 Tab 鍵聚焦，允許鍵盤用戶跳過 Navbar 直達主內容
        */}
        <a
          href="#main-content"
          className={[
            "sr-only",
            // 聚焦時浮出
            "focus:not-sr-only",
            "focus:fixed focus:top-4 focus:left-4 focus:z-[9999]",
            "focus:px-4 focus:py-2 focus:rounded-lg",
            "focus:bg-primary focus:text-primary-foreground",
            "focus:font-medium focus:text-sm",
            "focus:shadow-lg",
            // focus ring — MASTER §11
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            // MASTER §7.3: reduced-motion — no transition on skip link
            "motion-safe:transition-none",
          ].join(" ")}
        >
          跳转到主要内容
        </a>

        {/*
          ── ThemeProvider — next-themes, class strategy ────────────────────
          MASTER §10: class strategy，支援 system / light / dark
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <SessionProvider session={session as any}>
            {/* Glassmorphism Navbar — MASTER §8.5，路由守衛在組件內 */}
            <Navbar />

            {/*
              ── Main Content Area ─────────────────────────────────────────
              id="main-content"  → skip link 錨點 (accessibility)
              pt-[72px]          → 浮動膠囊：pt-4(16px)+h-14(56px)=72px (MASTER §14)
              min-h-[calc(100vh-4rem)] → 確保短內容頁面也填滿視窗
            */}
            <MainContent>{children}</MainContent>

            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
