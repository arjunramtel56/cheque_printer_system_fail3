import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 100, display: "flex", gap: 10 }}>
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "60px 24px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 24, color: "var(--text-primary)" }}>
          Features
        </h1>
        <div className="card" style={{ lineHeight: 1.7, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
          <ul style={{ listStyle: "disc", paddingLeft: 20, display: "grid", gap: 8 }}>
            <li>Bank-specific cheque templates with verified dimensions</li>
            <li>Direct feed and A4 carrier print modes</li>
            <li>MICR safety zone protection</li>
            <li>Amount in words conversion (English &amp; Nepali)</li>
            <li>Calibration controls for precise alignment</li>
            <li>Multi-language support (English &amp; Nepali)</li>
            <li>Dark mode support</li>
          </ul>
          <p style={{ marginTop: 24 }}>
            <Link href="/" className="text-button">Back to Home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
