import type { Metadata } from "next";
import "./globals.css";
import "@/styles/cheque-print.css";

export const metadata: Metadata = {
  title: "Reactify Cheque Printer System",
  description:
    "Prepare and print Nepalese bank cheques with calibrated templates and precise alignment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
