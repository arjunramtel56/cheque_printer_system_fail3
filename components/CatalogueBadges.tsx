import type { BankTemplate, VerificationStatus } from "@/lib/types";
import { getPaperSize } from "@/lib/sizes";
import { resolvePaper } from "@/lib/printGeometry";
import { MICR_BAND_MM } from "@/data/templates";

const VERIFICATION_LABELS: Record<VerificationStatus, { label: string; tone: string; title: string }> = {
  unverified: {
    label: "Layout unverified",
    tone: "var(--danger)",
    title: "This layout has never been checked against a physical cheque from this bank.",
  },
  "browser-verified": {
    label: "Browser verified",
    tone: "var(--warning, #b45309)",
    title: "The layout renders correctly in the browser. A physical printer test has not been recorded.",
  },
  "physically-calibrated": {
    label: "Physically calibrated",
    tone: "var(--success)",
    title: "This layout was measured against real cheque stock and aligned within tolerance.",
  },
};

/** Verification status pill. Browser-verified and physically-calibrated are
 *  deliberately distinct — the app never claims physical success it has not
 *  measured. */
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const meta = VERIFICATION_LABELS[status] ?? VERIFICATION_LABELS.unverified;
  return (
    <span
      title={meta.title}
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        color: meta.tone,
        border: `1px solid ${meta.tone}`,
        borderRadius: 10,
        padding: "1px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

/** Physical facts about a template, read from the size/paper registries. */
export function TemplateMeta({ template }: { template: BankTemplate }) {
  const paper = resolvePaper(template, "a4_vertical");
  const a4 = getPaperSize("a4-portrait");
  const supported = template.print?.supportedModes ?? [];
  return (
    <ul style={{ margin: "6px 0 0 0", padding: 0, listStyle: "none", fontSize: "0.8rem", color: "var(--text-muted)", display: "grid", gap: 2 }}>
      <li>
        Cheque {template.widthMm} × {template.heightMm} mm · {template.orientation} · size registry {template.sizeId}
      </li>
      <li>
        Carrier: {a4 ? `${a4.widthMm} × ${a4.heightMm} mm` : "n/a"} (cheque inset at {paper.widthMm === template.widthMm ? "0, 0" : `${template.profiles.a4_vertical.x}, ${template.profiles.a4_vertical.y}`} mm)
      </li>
      <li>Supported modes: {supported.length > 0 ? supported.join(", ") : "none"}</li>
      <li>Reserved MICR band: bottom {MICR_BAND_MM} mm — never printed</li>
      {template.verification?.note && <li>{template.verification.note}</li>}
    </ul>
  );
}
