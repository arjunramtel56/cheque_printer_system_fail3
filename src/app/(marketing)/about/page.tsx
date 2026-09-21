import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 100, display: "flex", gap: 10 }}>
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 24, color: "var(--text-primary)" }}>
          About
        </h1>
        <div className="card" style={{ lineHeight: 1.7, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          <p style={{ marginBottom: 16 }}>
            Reactify Cheque Printer System is a client-side cheque preparation tool designed for Nepalese banks.
            It allows users to fill in cheque details using calibrated templates and print them directly.
          </p>
          <p style={{ marginBottom: 16 }}>
            The system supports all major banks in Nepal with verified cheque dimensions and print profiles.
          </p>
          <p>
            <Link href="/" className="text-button">Back to Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
