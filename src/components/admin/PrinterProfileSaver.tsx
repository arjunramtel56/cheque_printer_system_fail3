"use client";

import { useState, useEffect } from "react";
import { savePrinterProfile, loadPrinterProfile } from "@/lib/printerProfile";
import { PRINTER_OFFSET_MIN_MM, PRINTER_OFFSET_MAX_MM } from "@/lib/printerProfile";
import { useLanguage } from "@/components/layout/LanguageProvider";
import type { ProfileKey } from "@/lib/types";

export interface PrinterProfileSaverProps {
  bankKey: string;
  printMode: ProfileKey;
}

export default function PrinterProfileSaver({ bankKey, printMode }: PrinterProfileSaverProps) {
  const { t, locale } = useLanguage();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [printerType, setPrinterType] = useState<"inkjet" | "laser">("inkjet");
  const [calibrated, setCalibrated] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded = loadPrinterProfile(bankKey, printMode);
    if (loaded) {
      setOffset({ x: loaded.offsetX, y: loaded.offsetY });
      setPrinterType(loaded.printerType);
      setCalibrated(loaded.calibrated);
    }
  }, [bankKey, printMode]);

  const handleSave = () => {
    const clampedX = Math.max(PRINTER_OFFSET_MIN_MM, Math.min(PRINTER_OFFSET_MAX_MM, offset.x));
    const clampedY = Math.max(PRINTER_OFFSET_MIN_MM, Math.min(PRINTER_OFFSET_MAX_MM, offset.y));

    savePrinterProfile(bankKey, printMode, {
      offsetX: clampedX,
      offsetY: clampedY,
      printerType,
      calibrated: true,
    });

    setSaved(true);
    setCalibrated(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset((prev) => ({ ...prev, x: Number(e.target.value) }));
    setSaved(false);
  };

  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset((prev) => ({ ...prev, y: Number(e.target.value) }));
    setSaved(false);
  };

  const statusText = locale === "ne" ? "प्रोफाइल सुरक्षित भयो!" : "Profile saved securely!";

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {locale === "ne" ? "प्रिन्टर क्यालिब्रेसन" : "Printer Calibration"}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            X {locale === "ne" ? "अफसेट (मिमी)" : "Offset (mm)"}
          </label>
          <input
            type="number"
            value={offset.x}
            onChange={handleXChange}
            min={PRINTER_OFFSET_MIN_MM}
            max={PRINTER_OFFSET_MAX_MM}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            Y {locale === "ne" ? "अफसेट (मिमी)" : "Offset (mm)"}
          </label>
          <input
            type="number"
            value={offset.y}
            onChange={handleYChange}
            min={PRINTER_OFFSET_MIN_MM}
            max={PRINTER_OFFSET_MAX_MM}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {locale === "ne" ? "प्रिन्टर प्रकार" : "Printer Type"}
          </label>
          <select
            value={printerType}
            onChange={(e) => setPrinterType(e.target.value as "inkjet" | "laser")}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500"
          >
            <option value="inkjet">{locale === "ne" ? "इन्क्जेट" : "Inkjet"}</option>
            <option value="laser">{locale === "ne" ? "लेजर" : "Laser"}</option>
          </select>
        </div>

        {saved && (
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            {statusText}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!calibrated && offset.x === 0 && offset.y === 0}
          className="w-full text-xs py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {locale === "ne" ? "बचत गर्नुस् / Save Profile" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

