"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChequeFieldConfig } from "@/types";

const FIELD_OPTIONS = [
  { value: "name", label: "Account Holder Name" },
  { value: "payee", label: "Payee Name" },
  { value: "date", label: "Date" },
  { value: "chequeNumber", label: "Cheque Number" },
  { value: "amountNumber", label: "Amount (Figure)" },
  { value: "amountWords", label: "Amount (Words)" },
] as const;

const FIELD_COLORS: Record<string, string> = {
  name: "#2563eb",
  payee: "#16a34a",
  date: "#dc2626",
  chequeNumber: "#9333ea",
  amountNumber: "#f59e0b",
  amountWords: "#059669",
};

interface DraggableField {
  id: string;
  field: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  align: string;
  color: string;
  rotation: number;
  label: string;
  bgColor: string;
}

interface DragDropEditorProps {
  width: number;
  height: number;
  fields: ChequeFieldConfig[];
  onChange: (fields: ChequeFieldConfig[]) => void;
  backgroundUrl?: string | null;
}

export default function DragDropFieldEditor({
  width,
  height,
  fields,
  onChange,
  backgroundUrl,
}: DragDropEditorProps) {
  const [draggableFields, setDraggableFields] = useState<DraggableField[]>(() =>
    fields.map((f) => toDraggable(f))
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraggableFields(fields.map((f) => toDraggable(f)));
  }, [fields]);

  function toDraggable(f: ChequeFieldConfig): DraggableField {
    const option = FIELD_OPTIONS.find((o) => o.value === f.field);
    return {
      id: f.id || f.field,
      field: f.field,
      x: f.x,
      y: f.y,
      width: f.width || 30,
      height: f.height || 10,
      fontSize: f.fontSize || 12,
      fontFamily: f.fontFamily || "Arial",
      fontWeight: f.fontWeight || "normal",
      align: f.align || "left",
      color: f.color || "#000000",
      rotation: f.rotation || 0,
      label: option?.label || f.field,
      bgColor: FIELD_COLORS[f.field] || "#6366f1",
    };
  }

  function toConfig(d: DraggableField): ChequeFieldConfig {
    return {
      id: d.id,
      field: d.field,
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      fontSize: d.fontSize,
      fontFamily: d.fontFamily,
      fontWeight: d.fontWeight,
      align: (d.align as "left" | "center" | "right") || "left",
      rotation: d.rotation,
      color: d.color,
      format: undefined,
    };
  }

  function handleAddField(fieldValue: string) {
    const newField: DraggableField = {
      id: `new_${Date.now()}`,
      field: fieldValue,
      x: 10,
      y: 10,
      width: 30,
      height: 10,
      fontSize: 12,
      fontFamily: "Arial",
      fontWeight: "normal",
      align: "left",
      color: "#000000",
      rotation: 0,
      label: FIELD_OPTIONS.find((o) => o.value === fieldValue)?.label || fieldValue,
      bgColor: FIELD_COLORS[fieldValue] || "#6366f1",
    };
    const updated = [...draggableFields, newField];
    setDraggableFields(updated);
    onChange(updated.map((d) => toConfig(d)));
  }

  function handleRemove(id: string) {
    const updated = draggableFields.filter((f) => f.id !== id);
    setDraggableFields(updated);
    onChange(updated.map((d) => toConfig(d)));
  }

  function handleFieldChange(id: string, key: keyof DraggableField, value: any) {
    const updated = draggableFields.map((f) => (f.id === id ? { ...f, [key]: value } : f));
    setDraggableFields(updated);
    onChange(updated.map((d) => toConfig(d)));
  }

  function handleMouseDown(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(id);
  }

  function handleMouseMove(e: MouseEvent, id: string) {
    if (draggingId !== id) return;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;

    setDraggableFields((prev) => {
      const updated = prev.map((f) =>
        f.id === id
          ? { ...f, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
          : f
      );
      onChange(updated.map((d) => toConfig(d)));
      return updated;
    });
  }

  function handleMouseUp(e: MouseEvent, id: string) {
    if (draggingId !== id) return;
    setDraggingId(null);
  }

  useEffect(() => {
    if (!draggingId) return;
    const handleMove = (e: MouseEvent) => handleMouseMove(e, draggingId);
    const handleUp = (e: MouseEvent) => handleMouseUp(e, draggingId);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [draggingId]);

  const selectedField = draggableFields.find((f) => f.id === draggingId);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-slate-600">Add field:</span>
        {FIELD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleAddField(opt.value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            + {opt.label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"
        style={{
          aspectRatio: `${width}/${height}`,
          maxWidth: "100%",
          minHeight: "200px",
        }}
      >
        <div
          className="relative h-full w-full"
          style={{
            backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundColor: backgroundUrl ? undefined : "#fafafa",
          }}
        >
          {draggableFields.map((f) => (
            <div
              key={f.id}
              className={`absolute cursor-move border-2 ${
                draggingId === f.id ? "border-blue-400 ring-2 ring-blue-300" : "border-transparent"
              }`}
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: `${f.width}%`,
                height: `${f.height}%`,
                fontSize: `${f.fontSize}px`,
                fontFamily: f.fontFamily,
                fontWeight: f.fontWeight,
                color: f.color,
                transform: f.rotation ? `rotate(${f.rotation}deg)` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: f.align as any,
                backgroundColor: `${f.bgColor}20`,
                borderColor: f.bgColor,
              }}
              onMouseDown={(e) => handleMouseDown(e, f.id)}
            >
              <span className="sr-only">{f.label}</span>
              <div className="truncate px-1 text-xs">{f.label}</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleRemove(f.id);
                }}
                className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedField && (
        <div className="rounded-lg border border-slate-200 p-3">
          <h4 className="mb-2 text-sm font-semibold text-slate-700">
            Editing: {selectedField.label}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">X (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={selectedField.x}
                onChange={(e) =>
                  handleFieldChange(selectedField.id, "x", parseFloat(e.target.value) || 0)
                }
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Y (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={selectedField.y}
                onChange={(e) =>
                  handleFieldChange(selectedField.id, "y", parseFloat(e.target.value) || 0)
                }
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Width (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={selectedField.width}
                onChange={(e) =>
                  handleFieldChange(selectedField.id, "width", parseFloat(e.target.value) || 1)
                }
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Height (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={selectedField.height}
                onChange={(e) =>
                  handleFieldChange(selectedField.id, "height", parseFloat(e.target.value) || 1)
                }
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Font size (px)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={selectedField.fontSize}
                onChange={(e) =>
                  handleFieldChange(selectedField.id, "fontSize", parseFloat(e.target.value) || 12)
                }
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Rotation (deg)</label>
              <input
                type="number"
                min="0"
                max="360"
                value={selectedField.rotation}
                onChange={(e) =>
                  handleFieldChange(selectedField.id, "rotation", parseFloat(e.target.value) || 0)
                }
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600">Align</label>
              <select
                value={selectedField.align}
                onChange={(e) => handleFieldChange(selectedField.id, "align", e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
