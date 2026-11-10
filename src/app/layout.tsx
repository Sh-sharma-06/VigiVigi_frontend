import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vigilant — AI Model Security",
  description:
    "Scan AI model files for hidden executable code before they ever touch your machine. Pickle VM, Keras AST checks and gVisor sandboxing with plain-English verdicts.",
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#e0607e" d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/></svg>'
      ),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {/* Ambient burgundy scene — drifting orbs + grain */}
        <div aria-hidden className="bg-scene">
          <div className="orb orb-a" />
          <div className="orb orb-b" />
          <div className="orb orb-c" />
          <div className="grain" />
        </div>
        {children}
      </body>
    </html>
  );
}
