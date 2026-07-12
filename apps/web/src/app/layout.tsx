import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowEasy Importer",
  description: "AI-powered CSV data ingestion pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          
          {/* Sleek Navigation Bar */}
          <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-black/60 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="font-bold text-lg tracking-tight flex items-center gap-2">
                <span className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs">GE</span>
                GrowEasy
              </div>
              <ThemeToggle />
            </div>
          </header>

          {/* Centered Main Content Area */}
          <main className="flex-1 w-full max-w-5xl mx-auto">
            {children}
          </main>
          
        </ThemeProvider>
      </body>
    </html>
  );
}