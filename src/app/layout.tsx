import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vigilant — AI Model Security Workstation",
  description:
    "User-end forensic workstation for scanning AI model artifacts: pickle VM, Keras/HDF5 AST, gVisor sandbox, safe-loader remediation and org hash allowlisting.",
  icons: {
    icon: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23dd4e83" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/></svg>'),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        {/* Liquid-glass ambient light field — the color the glass refracts */}
        <div className="ambient-stage" aria-hidden>
          <div className="ambient-orb orb-wine" />
          <div className="ambient-orb orb-rose" />
          <div className="ambient-orb orb-violet" />
          <div className="ambient-orb orb-ember" />
          <div className="ambient-horizon" />
          <div className="ambient-grain" />
        </div>
        {children}
      </body>
    </html>
  );
}
