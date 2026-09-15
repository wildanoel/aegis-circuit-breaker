import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aegisbreaker.app"),
  title: "Aegis: Exploit Circuit Breaker on GenLayer",
  description:
    "Aegis verifies exploit reports with GenLayer validator consensus. On confirmation it halts the target protocol and pays the reporter, with no multisig and no trusted operator.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Aegis: Exploit Circuit Breaker on GenLayer",
    description:
      "AI-verified exploit reports. On consensus, Aegis pauses the target protocol and pays the reporter. No multisig, no trusted operator.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    siteName: "Aegis",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegis: Exploit Circuit Breaker on GenLayer",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Applied before hydration so the stored theme never flashes the wrong mode.
const THEME_INIT = `try{var t=localStorage.getItem("aegis-theme");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${grotesk.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
