import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import Script from "next/script";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "FactRepo - 공익 팩트체크 아카이브",
  description: "공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {recaptchaSiteKey && (
          <Script
            id="recaptcha-v3-script"
            src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`}
            strategy="lazyOnload"
          />

        )}
      </head>
      <body className="min-h-full flex flex-col">

        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
