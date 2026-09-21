"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

// ---------------------------------------------------------------------------
// ChequeOverlayWorkspace — standalone cheque overlay print tool.
//
// Users upload a cheque photo, enter details (payee, date, amount), and
// position text fields by dragging on the live preview. Templates can be
// saved to / loaded from localStorage. Print output is A4 landscape with
// the cheque preview filling the page.
// ---------------------------------------------------------------------------

interface FieldPosition {
  x: number;
  y: number;
  font: number;
}

interface Positions {
  name: FieldPosition;
  date: FieldPosition;
  words: FieldPosition;
  number: FieldPosition;
}

interface Template {
  positions: Positions;
  name: string;
  date: string;
  number: string;
  words: string;
  watermark: boolean;
}

const DEFAULT_POSITIONS: Positions = {
  name: { x: 120, y: 215, font: 19 },
  date: { x: 700, y: 55, font: 19 },
  words: { x: 140, y: 275, font: 18 },
  number: { x: 690, y: 315, font: 19 },
};

// ---------------------------------------------------------------------------
// Amount to words — Nepali numbering system (Crore/Lakh/Thousand)
// ---------------------------------------------------------------------------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
  "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
  "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
  "Eighty", "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? "-" + ONES[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let result = "";
  if (h > 0) result += `${ONES[h]} Hundred`;
  if (r > 0) result += `${result ? " " : ""}${twoDigits(r)}`;
  return result;
}

function amountToWords(value: number | string): string {
  const amount = Math.floor(Number(value));
  if (!Number.isFinite(amount) || amount < 0) return "";
  if (amount === 0) return "Zero Rupees Only";

  let remaining = amount;
  const parts: string[] = [];

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  if (crore > 0) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${threeDigits(thousand)} Thousand`);
  if (remaining > 0) parts.push(threeDigits(remaining));

  return `${parts.join(" ")} Rupees Only`;
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDate(value: string): string {
  if (!value) return "DD/MM/YYYY";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChequeOverlayWorkspace() {
  const previewRef = useRef<HTMLDivElement>(null);

  const [imageFile, setImageFile] = useState<string>("");
  const [nameVal, setNameVal] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [numberVal, setNumberVal] = useState("");
  const [wordsVal, setWordsVal] = useState("");
  const [selectedField, setSelectedField] = useState<keyof Positions>("name");
  const [positions, setPositions] = useState<Positions>({ ...DEFAULT_POSITIONS });
  const [watermark, setWatermark] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [wordsManuallyEdited, setWordsManuallyEdited] = useState(false);

  const dragRef = useRef<{
    key: keyof Positions;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // --- Derived values -------------------------------------------------------

  const formattedDate = formatDate(dateVal);
  const amountNumber = Number(numberVal || 0);
  const displayNumber =
    "Rs. " +
    amountNumber.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const displayWords = wordsVal.trim() || "Amount in Words";
  const displayName = nameVal.trim() || "DEMO CUSTOMER";

  // --- Helpers --------------------------------------------------------------

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
  }, []);

  const clearMessages = useCallback(() => {
    setErrorMsg("");
    setSuccessMsg("");
  }, []);

  // --- Sync auto-words when number changes ----------------------------------

  useEffect(() => {
    if (!wordsManuallyEdited) {
      const auto = amountToWords(numberVal);
      setWordsVal(auto);
    }
  }, [numberVal, wordsManuallyEdited]);

  // --- Apply positions to overlay elements ----------------------------------

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const fields = el.querySelectorAll<HTMLElement>(".text-field");
    fields.forEach((field) => {
      const key = field.dataset.field as keyof Positions;
      if (!key || !positions[key]) return;
      const p = positions[key];
      field.style.left = `${p.x}px`;
      field.style.top = `${p.y}px`;
      field.style.fontSize = `${p.font}px`;
    });
  }, [positions, displayName, formattedDate, displayNumber, displayWords]);

  // --- Field selection ------------------------------------------------------

  function selectField(key: keyof Positions) {
    setSelectedField(key);
    const el = previewRef.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>(".text-field").forEach((f) => {
      f.classList.toggle("selected", f.dataset.field === key);
    });
  }

  // --- Position input sync --------------------------------------------------

  function handlePositionChange(
    axis: "x" | "y" | "font",
    raw: string,
  ) {
    const val = Number(raw) || 0;
    setPositions((prev) => ({
      ...prev,
      [selectedField]: {
        ...prev[selectedField],
        [axis]: axis === "font"
          ? Math.max(8, Math.min(60, val))
          : axis === "x"
            ? Math.max(0, Math.min(1000, val))
            : Math.max(0, Math.min(470, val)),
      },
    }));
  }

  // --- Drag handlers --------------------------------------------------------

  function handleMouseDown(key: keyof Positions, e: React.MouseEvent) {
    e.preventDefault();
    selectField(key);
    const p = positions[key];
    dragRef.current = {
      key,
      startX: e.clientX,
      startY: e.clientY,
      origX: p.x,
      origY: p.y,
    };
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const d = dragRef.current;
      const dx = (e.clientX - d.startX) / zoom;
      const dy = (e.clientY - d.startY) / zoom;
      setPositions((prev) => ({
        ...prev,
        [d.key]: {
          ...prev[d.key],
          x: Math.max(0, Math.min(960, d.origX + dx)),
          y: Math.max(0, Math.min(440, d.origY + dy)),
        },
      }));
    }
    function onMouseUp() {
      dragRef.current = null;
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [zoom]);

  // --- Image upload ---------------------------------------------------------

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    clearMessages();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      e.target.value = "";
      showError("कृपया JPG, JPEG वा PNG file मात्र upload गर्नुहोस्।");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      e.target.value = "";
      showError("Image file 10 MB भन्दा कम हुनुपर्छ।");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageFile(ev.target?.result as string);
      showSuccess("Cheque photo upload भयो। अब preview मा देखिएको text मिलाउनुहोस्।");
    };
    reader.onerror = () => showError("Photo load गर्न सकिएन।");
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageFile("");
    showSuccess("Uploaded photo हटाइयो।");
  }

  // --- Template save / load / reset -----------------------------------------

  function handleSave() {
    const template: Template = {
      positions,
      name: nameVal,
      date: dateVal,
      number: numberVal,
      words: wordsVal,
      watermark,
    };
    localStorage.setItem("cheque-overlay-template", JSON.stringify(template));
    showSuccess("Template save भयो।");
  }

  function handleLoad() {
    const saved = localStorage.getItem("cheque-overlay-template");
    if (!saved) {
      showError("Saved template भेटिएन।");
      return;
    }
    try {
      const tpl: Template = JSON.parse(saved);
      if (tpl.positions) setPositions(tpl.positions);
      setNameVal(tpl.name || "");
      setDateVal(tpl.date || "");
      setNumberVal(tpl.number || "");
      setWordsVal(tpl.words || "");
      setWatermark(tpl.watermark !== false);
      setWordsManuallyEdited(false);
      showSuccess("Template load भयो।");
    } catch {
      showError("Template load गर्दा error आयो।");
    }
  }

  function handleReset() {
    setPositions({ ...DEFAULT_POSITIONS });
    setNameVal("");
    setDateVal("");
    setNumberVal("");
    setWordsVal("");
    setWordsManuallyEdited(false);
    setImageFile("");
    setWatermark(true);
    showSuccess("All settings reset भयो।");
  }

  // --- Print ----------------------------------------------------------------

  function handlePrint() {
    clearMessages();
    if (!imageFile) {
      showError("पहिला cheque photo upload गर्नुहोस्।");
      return;
    }
    if (!nameVal.trim()) {
      showError("Name भर्नुहोस्।");
      return;
    }
    if (!dateVal) {
      showError("Date छान्नुहोस्।");
      return;
    }
    if (!numberVal) {
      showError("Amount भर्नुहोस्।");
      return;
    }
    window.print();
  }

  // --- Zoom -----------------------------------------------------------------

  function zoomIn() {
    setZoom((z) => Math.min(1.5, z + 0.1));
  }
  function zoomOut() {
    setZoom((z) => Math.max(0.5, z - 0.1));
  }
  function zoomReset() {
    setZoom(1);
  }

  // --- Current field values for sidebar -------------------------------------

  const currentPos = positions[selectedField];

  return (
    <>
      {/* Screen-only UI */}
      <div className="overlay-no-print">
        <div className="overlay-layout">
          {/* ---- Left panel: form ---- */}
          <div className="overlay-panel">
            <div className="overlay-panel-header">
              <h2>Details Entry</h2>
              <div style={{ display: "flex", gap: 6 }}>
                <ThemeToggle />
                <LanguageToggle />
              </div>
            </div>

            <label htmlFor="overlay-image-input">1. Cheque Photo Upload गर्नुहोस्</label>
            <input
              id="overlay-image-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              className="overlay-btn overlay-btn-red"
              onClick={handleRemoveImage}
            >
              Remove Uploaded Photo
            </button>

            <label htmlFor="overlay-name">2. Name / नाम</label>
            <input
              id="overlay-name"
              type="text"
              placeholder="DEMO CUSTOMER"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
            />

            <label htmlFor="overlay-date">3. Date / मिति</label>
            <input
              id="overlay-date"
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
            />

            <label htmlFor="overlay-number">4. Amount in Number / रकम अंकमा</label>
            <input
              id="overlay-number"
              type="number"
              min={0}
              step={0.01}
              placeholder="10000"
              value={numberVal}
              onChange={(e) => {
                setNumberVal(e.target.value);
                setWordsManuallyEdited(false);
              }}
            />

            <label htmlFor="overlay-words">5. Amount in Words / रकम अक्षरमा</label>
            <textarea
              id="overlay-words"
              placeholder="Ten Thousand Rupees Only"
              value={wordsVal}
              onChange={(e) => {
                setWordsVal(e.target.value);
                setWordsManuallyEdited(true);
              }}
            />

            <label htmlFor="overlay-field-select">
              6. Move/Resize गर्न Field छान्नुहोस्
            </label>
            <select
              id="overlay-field-select"
              value={selectedField}
              onChange={(e) => selectField(e.target.value as keyof Positions)}
            >
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="words">Amount Words</option>
              <option value="number">Amount Number</option>
            </select>

            <div className="overlay-two-col">
              <div>
                <label htmlFor="overlay-x">X Position</label>
                <input
                  id="overlay-x"
                  type="number"
                  min={0}
                  max={1000}
                  value={Math.round(currentPos.x)}
                  onChange={(e) => handlePositionChange("x", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="overlay-y">Y Position</label>
                <input
                  id="overlay-y"
                  type="number"
                  min={0}
                  max={470}
                  value={Math.round(currentPos.y)}
                  onChange={(e) => handlePositionChange("y", e.target.value)}
                />
              </div>
            </div>

            <label htmlFor="overlay-font">Font Size</label>
            <input
              id="overlay-font"
              type="number"
              min={8}
              max={60}
              value={currentPos.font}
              onChange={(e) => handlePositionChange("font", e.target.value)}
            />

            <label className="overlay-check-label">
              <input
                type="checkbox"
                checked={watermark}
                onChange={(e) => setWatermark(e.target.checked)}
              />
              SAMPLE / TEST watermark देखाउने
            </label>

            <button type="button" className="overlay-btn overlay-btn-green" onClick={handleSave}>
              Save Template
            </button>
            <button type="button" className="overlay-btn overlay-btn-gray" onClick={handleLoad}>
              Load Template
            </button>
            <button type="button" className="overlay-btn overlay-btn-red" onClick={handleReset}>
              Reset All
            </button>
            <button type="button" className="overlay-btn" onClick={handlePrint}>
              Print Preview
            </button>

            {errorMsg && <div className="overlay-error">{errorMsg}</div>}
            {successMsg && <div className="overlay-success">{successMsg}</div>}

            <p className="overlay-help">
              Preview मा देखिएको text माथि mouse राखेर drag गर्दा text को
              position परिवर्तन हुन्छ। पहिले test paper मा print गरेर alignment
              मिलाउनुहोस्।
            </p>
          </div>

          {/* ---- Right: preview ---- */}
          <div className="overlay-preview-panel">
            <h2>Uploaded Photo Preview</h2>

            <div className="overlay-preview-scroll">
              <div
                className="overlay-cheque-preview"
                ref={previewRef}
                style={{ transform: `scale(${zoom})` }}
              >
                {!imageFile && (
                  <div className="overlay-empty-message">
                    यहाँ तपाईंले upload गरेको cheque photo देखिन्छ
                  </div>
                )}

                {watermark && (
                  <div className="overlay-watermark">SAMPLE / TEST</div>
                )}

                <div
                  className="text-field"
                  data-field="name"
                  style={{ left: positions.name.x, top: positions.name.y, fontSize: positions.name.font }}
                  onMouseDown={(e) => handleMouseDown("name", e)}
                >
                  {displayName}
                </div>

                <div
                  className="text-field"
                  data-field="date"
                  style={{ left: positions.date.x, top: positions.date.y, fontSize: positions.date.font }}
                  onMouseDown={(e) => handleMouseDown("date", e)}
                >
                  {formattedDate}
                </div>

                <div
                  className="text-field"
                  data-field="words"
                  style={{ left: positions.words.x, top: positions.words.y, fontSize: positions.words.font }}
                  onMouseDown={(e) => handleMouseDown("words", e)}
                >
                  {displayWords}
                </div>

                <div
                  className="text-field"
                  data-field="number"
                  style={{ left: positions.number.x, top: positions.number.y, fontSize: positions.number.font }}
                  onMouseDown={(e) => handleMouseDown("number", e)}
                >
                  {displayNumber}
                </div>
              </div>
            </div>

            <div className="overlay-zoom-row">
              <button type="button" className="overlay-btn overlay-btn-gray" onClick={zoomOut}>
                Zoom -
              </button>
              <button type="button" className="overlay-btn overlay-btn-gray" onClick={zoomReset}>
                Zoom Reset
              </button>
              <button type="button" className="overlay-btn overlay-btn-gray" onClick={zoomIn}>
                Zoom +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only output */}
      <div className="overlay-print-output">
        <div
          className="overlay-cheque-preview"
          style={{
            width: 1000,
            height: 470,
            backgroundImage: imageFile ? `url("${imageFile}")` : undefined,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          {watermark && <div className="overlay-watermark">SAMPLE / TEST</div>}
          {Object.entries({
            name: { text: displayName, pos: positions.name },
            date: { text: formattedDate, pos: positions.date },
            words: { text: displayWords, pos: positions.words },
            number: { text: displayNumber, pos: positions.number },
          }).map(([key, { text, pos }]) => (
            <div
              key={key}
              className="text-field"
              style={{
                left: pos.x,
                top: pos.y,
                fontSize: pos.font,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
