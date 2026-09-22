"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Copy, Check, Ruler } from "lucide-react";

type FieldKey = "payeeName" | "date" | "amountFig" | "amountWrd";

interface FieldMm {
  x: string;
  y: string;
  fontSize: string;
}

const FIELD_META: Record<FieldKey, { label: string; color: string; templateField: string }> = {
  payeeName: { label: "Payee", color: "#2563eb", templateField: "payee" },
  date: { label: "Date", color: "#16a34a", templateField: "date" },
  amountFig: { label: "Amount figure", color: "#dc2626", templateField: "amountNumber" },
  amountWrd: { label: "Amount words", color: "#9333ea", templateField: "amountWords" },
};

const DEFAULT_FIELDS: Record<FieldKey, FieldMm> = {
  payeeName: { x: "25", y: "45", fontSize: "12" },
  date: { x: "165", y: "18", fontSize: "11" },
  amountFig: { x: "165", y: "45", fontSize: "12" },
  amountWrd: { x: "25", y: "55", fontSize: "10" },
};

const FIELD_KEYS = Object.keys(DEFAULT_FIELDS) as FieldKey[];
const SHEET_W = 210;
const SHEET_H = 297;
const X_TICKS = Array.from({ length: SHEET_W / 10 + 1 }, (_, i) => i * 10);
const Y_TICKS = Array.from({ length: 30 }, (_, i) => i * 10);

function num(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export default function CalibrationTool() {
  const [fields, setFields] = useState<Record<FieldKey, FieldMm>>(DEFAULT_FIELDS);
  const [chequeWidth, setChequeWidth] = useState("210");
  const [chequeHeight, setChequeHeight] = useState("90");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-calibration", "true");
    style.textContent = `
@media print {
  @page { size: A4; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
  }
}
`;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  const mmJson = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(FIELD_KEYS.map((k) => [k, { x: num(fields[k].x), y: num(fields[k].y), fontSize: num(fields[k].fontSize) }])),
        null,
        2
      ),
    [fields]
  );

  const pctJson = useMemo(() => {
    const w = num(chequeWidth) || 1;
    const h = num(chequeHeight) || 1;
    return JSON.stringify(
      Object.fromEntries(
        FIELD_KEYS.map((k) => [
          FIELD_META[k].templateField,
          {
            x: Number(((num(fields[k].x) / w) * 100).toFixed(2)),
            y: Number(((num(fields[k].y) / h) * 100).toFixed(2)),
            fontSize: num(fields[k].fontSize),
          },
        ])
      ),
      null,
      2
    );
  }, [fields, chequeWidth, chequeHeight]);

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function updateField(key: FieldKey, prop: keyof FieldMm, value: string) {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], [prop]: value } }));
  }

  const cw = num(chequeWidth);
  const ch = num(chequeHeight);

  return (
    <main className="calibration-shell min-h-screen bg-[#f6f8fc] p-4 md:p-8 print:m-0 print:bg-white print:p-0 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(360px,460px)_auto]">
        <div className="no-print min-w-0 space-y-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <Ruler size={13} />
              Dev tool — hidden in production
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 md:text-3xl">
              Print Calibration
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Measure real-cheque field positions against a 10 mm A4 grid, then export template JSON.
            </p>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 font-bold text-slate-900 dark:text-slate-100">Procedure</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>
                Click <strong>Print sheet</strong>. Choose A4 portrait and <strong>100% scale</strong> —
                disable &quot;Fit to page&quot; / &quot;Shrink to fit&quot;.
              </li>
              <li>
                Verify the printed <strong>50 mm test square</strong> with a physical ruler. If it is not
                exactly 50 mm, the print was scaled — reprint at 100%.
              </li>
              <li>
                Lay the sheet over a real cheque leaf, aligning the cheque&apos;s top-left corner with the{" "}
                <strong>ORIGIN (0,0)</strong> mark. Hold against light.
              </li>
              <li>
                Read each field position in mm from the grid: payee line, date box, amount figure box,
                amount words line.
              </li>
              <li>Enter the measurements below, copy the JSON, and apply it to the template.</li>
              <li>
                Print a cheque and overlay the sheet again — each crosshair marker should sit exactly on
                its printed field.
              </li>
            </ol>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Some printers leave a ~5 mm unprintable edge. If border lines are clipped, measure from the
              nearest visible numbered grid line and account for the missing margin.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
            >
              <Printer size={17} />
              Print sheet
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-1 font-bold text-slate-900 dark:text-slate-100">Measured offsets</h2>
            <p className="mb-4 text-xs text-slate-500">
              Coordinates are millimetres from ORIGIN (top-left of the cheque leaf).
            </p>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Cheque width (mm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={chequeWidth}
                  onChange={(e) => setChequeWidth(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Cheque height (mm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={chequeHeight}
                  onChange={(e) => setChequeHeight(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-3">
              {FIELD_KEYS.map((key) => (
                <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: FIELD_META[key].color }}
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {FIELD_META[key].label}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">→ {FIELD_META[key].templateField}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["x", "y", "fontSize"] as const).map((prop) => (
                      <div key={prop}>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500">
                          {prop === "fontSize" ? "Font (px)" : `${prop.toUpperCase()} (mm)`}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fields[key][prop]}
                          onChange={(e) => updateField(key, prop, e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Template JSON (mm)</h2>
              <button
                type="button"
                onClick={() => copyText("mm", mmJson)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                {copied === "mm" ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied === "mm" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300">
              {mmJson}
            </pre>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                Template fields (% — current schema)
              </h2>
              <button
                type="button"
                onClick={() => copyText("pct", pctJson)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                {copied === "pct" ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied === "pct" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Converted to percentages of cheque {cw}×{ch} mm — matches the existing{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">ChequeFieldConfig</code> schema.
            </p>
            <pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-emerald-300">
              {pctJson}
            </pre>
          </section>
        </div>

        <div className="overflow-auto print:m-0 print:block print:overflow-visible print:p-0">
          <div
            className="relative h-[297mm] w-[210mm] overflow-hidden bg-white shadow-xl [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:m-0 print:h-[297mm] print:w-[210mm] print:shadow-none"
          >
            <svg
              viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
              className="block h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width={SHEET_W} height={SHEET_H} fill="#ffffff" />

              {X_TICKS.map((x) => (
                <line
                  key={`vx-${x}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={SHEET_H}
                  stroke={x % 50 === 0 ? "#8a8a8a" : "#c8c8c8"}
                  strokeWidth={x % 50 === 0 ? 0.15 : 0.1}
                />
              ))}
              {Y_TICKS.map((y) => (
                <line
                  key={`hy-${y}`}
                  x1={0}
                  y1={y}
                  x2={SHEET_W}
                  y2={y}
                  stroke={y % 50 === 0 ? "#8a8a8a" : "#c8c8c8"}
                  strokeWidth={y % 50 === 0 ? 0.15 : 0.1}
                />
              ))}

              {X_TICKS.filter((x) => x > 0).map((x) => (
                <text
                  key={`xl-${x}`}
                  x={x === SHEET_W ? x - 1.5 : x + 1.2}
                  y={3.4}
                  fontSize={2.6}
                  fill="#666666"
                  fontFamily="Arial, sans-serif"
                  textAnchor={x === SHEET_W ? "end" : "start"}
                >
                  {x}
                </text>
              ))}
              {Y_TICKS.filter((y) => y > 0).map((y) => (
                <text
                  key={`yl-${y}`}
                  x={1.2}
                  y={y - 1.2}
                  fontSize={2.6}
                  fill="#666666"
                  fontFamily="Arial, sans-serif"
                >
                  {y}
                </text>
              ))}

              <line x1={0} y1={0} x2={14} y2={0} stroke="#111111" strokeWidth={0.6} />
              <line x1={0} y1={0} x2={0} y2={14} stroke="#111111" strokeWidth={0.6} />
              <text x={1.5} y={5.8} fontSize={3} fontWeight="bold" fill="#111111" fontFamily="Arial, sans-serif">
                0,0
              </text>

              {cw > 0 && ch > 0 && (
                <g>
                  <rect
                    x={0.4}
                    y={0.4}
                    width={Math.min(cw, SHEET_W) - 0.8}
                    height={Math.min(ch, SHEET_H) - 0.8}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={0.35}
                    strokeDasharray="3 2"
                  />
                  <text
                    x={2}
                    y={Math.min(ch, SHEET_H) - 2.5}
                    fontSize={2.8}
                    fill="#d97706"
                    fontFamily="Arial, sans-serif"
                  >
                    Cheque {cw}×{ch} mm
                  </text>
                </g>
              )}

              {FIELD_KEYS.map((key) => {
                const meta = FIELD_META[key];
                const x = num(fields[key].x);
                const y = num(fields[key].y);
                const nearRight = x > SHEET_W - 45;
                return (
                  <g key={`marker-${key}`} transform={`translate(${x} ${y})`} stroke={meta.color}>
                    <line x1={-5} y1={0} x2={5} y2={0} strokeWidth={0.35} />
                    <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={0.35} />
                    <circle cx={0} cy={0} r={1.4} fill="none" strokeWidth={0.35} />
                    <text
                      x={nearRight ? -6 : 6}
                      y={-3}
                      fontSize={2.8}
                      fontWeight="bold"
                      fill={meta.color}
                      stroke="none"
                      fontFamily="Arial, sans-serif"
                      textAnchor={nearRight ? "end" : "start"}
                    >
                      {meta.label} ({x}, {y})
                    </text>
                  </g>
                );
              })}

              <g>
                <rect x={15} y={225} width={50} height={50} fill="none" stroke="#0f172a" strokeWidth={0.45} />
                <text
                  x={40}
                  y={281}
                  fontSize={2.8}
                  fill="#0f172a"
                  fontFamily="Arial, sans-serif"
                  textAnchor="middle"
                >
                  50 mm — verify with a ruler (print at 100%)
                </text>
              </g>

              <rect
                x={0.15}
                y={0.15}
                width={SHEET_W - 0.3}
                height={SHEET_H - 0.3}
                fill="none"
                stroke="#111111"
                strokeWidth={0.3}
              />
            </svg>
          </div>
        </div>
      </div>
    </main>
  );
}
