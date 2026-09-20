"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function TrustBadge() {
  const { locale } = useLanguage();

  const badgeText = locale === "ne" ? "यस टुलले मात्र चेकमा ढाल्नुपर्ने फाँटहरू नै छाप्छ" : "This tool only prints variable fields onto cheque stock";
  const securityText =
    locale === "ne"
      ? "डाटा ब्राउज़रभित्रै ढुवाइन्छ — कहिले पनि सर्भरमा पठाइँछैन"
      : "Data stays in your browser — never sent to a server";
  const sslText = locale === "ne" ? "SSL सुरक्षित" : "SSL Secured";

  return (
    <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
      <div
        className="tip-card"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", maxWidth: "100%" }}
        aria-label={sslText}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>{sslText}</span>
      </div>
      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
        {badgeText} · {securityText}
      </span>
    </div>
  );
}
