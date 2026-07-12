"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch on load
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <>{children}</>;
  
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}