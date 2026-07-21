import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { ClientProviders } from "@/components/providers/ClientProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Графики — медперсонал",
  description: "Создание и редактирование графиков смен медицинского персонала",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} light h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ClientProviders>
          <AppHeader />
          <div className="flex-1">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
