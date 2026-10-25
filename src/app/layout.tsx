import type { Metadata } from "next";
import "./globals.css";
import "@/styles/cheque-print.css";
import { ThemeProvider, ThemeScript } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";

export const metadata: Metadata = {
  title: "Reactify Cheque Printer System",
  description:
    "Prepare and print Nepalese bank cheques with calibrated templates and precise alignment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <ConvexClientProvider>
            <ToastProvider>{children}</ToastProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
