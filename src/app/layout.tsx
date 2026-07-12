import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/context/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster"
import Navbar from "@/components/Navbar";
const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "Candor collects honest, anonymous feedback and turns it into an AI growth plan you can track. Share your link and start improving.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Candor — Honest feedback, real growth",
    template: "%s · Candor",
  },
  description,
  applicationName: "Candor",
  keywords: [
    "anonymous feedback",
    "honest feedback",
    "AI feedback coach",
    "anonymous messages",
    "feedback app",
    "personal growth",
    "NGL alternative",
    "Qooh.me alternative",
    "360 feedback",
  ],
  authors: [{ name: "Yogesh Chauhan", url: "https://yogeshchauhan.dev" }],
  creator: "Yogesh Chauhan",
  publisher: "Yogesh Chauhan",
  category: "productivity",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Candor",
    title: "Candor — Honest feedback, real growth",
    description: "Anonymous feedback, turned into an AI growth plan you can actually act on.",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Candor — Honest feedback, real growth",
    description: "Anonymous feedback, turned into an AI growth plan you can actually act on.",
    images: ["/og-image.png"],
  },
  // favicon.ico (16/32/48) for legacy chrome, icon.svg for crisp scaling on
  // modern browsers, apple-icon.png for iOS home-screen bookmarks.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: "/apple-icon.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              <Navbar />
              {children}
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
