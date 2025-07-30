import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import SessionProvider from "@/components/SessionProvider";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "PonyMind - 知识分享社区",
  description: "一个专注于知识分享和讨论的社区平台",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html lang="zh">
      <body className="font-sans">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <SessionProvider session={session as any}>
          <ConditionalNavbar />
          <main>{children}</main>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
