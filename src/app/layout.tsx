import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Professional type system:
   — Inter: neutral, crisp UI text (industry standard for security tooling)
   — Space Grotesk: distinctive display face for titles & the logo
   — JetBrains Mono: hashes, logs, metrics */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vigilant — AI Model Security",
  description:
    "Scan AI model files for hidden executable code before they ever touch your machine. Pickle VM, Keras AST checks and gVisor sandboxing with plain-English verdicts.",
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#8b8cf7" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/></svg>'
      ),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        {/* Obsidian ambient scene — grid, speck fields, conic halo,
            aurora ribbons, orbs, scan sweep, grain, vignette */}
        <div aria-hidden className="bg-scene">
          <div className="bg-grid" />
          <div className="dots dots-a" />
          <div className="dots dots-b" />
          <div className="halo" />
          <div className="ribbon ribbon-a" />
          <div className="ribbon ribbon-b" />
          <div className="ribbon ribbon-c" />
          <div className="orb orb-a" />
          <div className="orb orb-b" />
          <div className="scanline" />
          <div className="grain" />
          <div className="bg-vignette" />
        </div>
        {children}
      </body>
    </html>
  );
}
