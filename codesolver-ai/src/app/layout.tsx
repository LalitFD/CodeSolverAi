import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeSolver AI",
  description: "A premium Gemini-powered coding assistant.",
  verification: {
    google: "EDSWSqtPvzDvhkeMOG9Ngsev3Oz7aJdfmmDmsLEtWcU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${jetbrainsMono.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
