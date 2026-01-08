import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Episode - 경험을 마인드맵으로 구조화하세요",
  description: "사용자의 경험을 마인드맵으로 구조화하고, AI 챗봇과 함께 STAR 방식으로 자기소개서를 작성할 수 있는 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        <script src="https://developers.kakao.com/sdk/js/kakao.js" async></script>
      </body>
    </html>
  );
}
