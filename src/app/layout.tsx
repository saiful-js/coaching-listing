import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { site } from "@/config/site";
import { env } from "@/lib/env";
import "./globals.css";

/* Display serif with optical sizing — carries headings and the wordmark. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
/* Bengali-capable face for user-entered content (names, descriptions). */
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hind-siliguri",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: `Coaching centres in Narayanganj · ${site.name}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} ${hindSiliguri.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
