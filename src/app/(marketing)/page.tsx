import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import TrustBadge from "@/components/ui/TrustBadge";

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 100, display: "flex", gap: 10 }}>
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <TrustBadge />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 16, color: "var(--text-primary)" }}>
            Reactify Cheque Printer System
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.6 }}>
            Prepare and print Nepalese bank cheques with calibrated templates and precise alignment.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth/login" className="button" style={{ fontSize: "1rem", padding: "14px 32px" }}>
              Get Started
            </Link>
            <Link href="/features" className="button secondary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
              Learn More
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>Bank Templates</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Access calibrated cheque templates for all major Nepalese banks with verified measurements.
            </p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>Print Ready</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Direct feed and A4 carrier modes with precise calibration for accurate alignment.
            </p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>Secure</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              MICR safety zones and built-in guards prevent printing over the magnetic ink line.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
