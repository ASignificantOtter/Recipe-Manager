import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recipe Hub",
  description: "A multi-user recipe management application with meal planning and shopping list generation",
};

const Navigation = dynamic(() => import("@/components/Navigation"), {
  ssr: true,
  loading: () => <div className="h-16 md:ml-64" />,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Navigation />
          <main className="md:ml-64 md:mt-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
