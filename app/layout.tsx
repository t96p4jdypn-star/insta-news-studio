import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insta News Studio",
  description: "ニュースから今日の投稿をつくる",
  manifest: "/manifest.webmanifest",
  applicationName: "Insta News Studio",
  appleWebApp: { capable: true, title: "News Studio", statusBarStyle: "default" },
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  openGraph: {
    title: "Insta News Studio",
    description: "ニュースから今日の投稿をつくる",
    type: "website",
    locale: "ja_JP",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Insta News Studio — ニュースから今日の投稿をつくる" }],
  },
  twitter: { card: "summary_large_image", title: "Insta News Studio", description: "ニュースから今日の投稿をつくる", images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f5ef" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
