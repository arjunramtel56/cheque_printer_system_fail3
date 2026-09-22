"use client";

import { forwardRef, useMemo } from "react";
import { A4, CHEQUE, DEFAULT_PLACEMENT, FIELD_POSITIONS } from "@/lib/cheque/constants";

export type ChequePrintProps = {
  payeeName: string;
  chequeDate: Date;
  amountFigure: number;
  amountWords: string;
  chequeNumber?: string;
  orientation: "PORTRAIT" | "LANDSCAPE";
  offsetXmm?: number;
  offsetYmm?: number;
  language?: "en" | "ne";
  accountPayeeOnly?: boolean;
  memo?: string;
  isTrial?: boolean;
};

const fmt = (d: Date, lang: "en" | "ne") =>
  new Intl.DateTimeFormat(lang === "ne" ? "ne-NP" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

const money = (n: number, lang: "en" | "ne") =>
  new Intl.NumberFormat(lang === "ne" ? "ne-NP" : "en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const ChequePrintLayout = forwardRef<HTMLDivElement, ChequePrintProps>(
  function ChequePrintLayout(props, ref) {
    const {
      orientation,
      offsetXmm = 0,
      offsetYmm = 0,
      language = "en",
      accountPayeeOnly,
      memo,
      isTrial = false,
    } = props;

    const placement = DEFAULT_PLACEMENT[orientation];
    const page = A4[orientation];

    const style = useMemo(
      () => ({
        page: {
          width: `${page.w}mm`,
          height: `${page.h}mm`,
        },
        cheque: {
          left: `${placement.x + offsetXmm}mm`,
          top: `${placement.y + offsetYmm}mm`,
          width: `${CHEQUE.WIDTH_MM}mm`,
          height: `${CHEQUE.HEIGHT_MM}mm`,
        },
      }),
      [page, placement, offsetXmm, offsetYmm]
    );

    return (
      <div ref={ref} className="cheque-page" style={style.page} data-orientation={orientation}>
        {isTrial && <div className="trial-watermark">TRIAL VERSION</div>}
        <div className="cheque-sheet" style={style.cheque}>
          {accountPayeeOnly && <div className="cheque-crossing">A/C PAYEE ONLY</div>}

          <div
            className="cheque-field"
            style={{
              left: `${FIELD_POSITIONS.date.x}mm`,
              top: `${FIELD_POSITIONS.date.y}mm`,
              width: `${FIELD_POSITIONS.date.w}mm`,
              textAlign: FIELD_POSITIONS.date.align,
            }}
          >
            {fmt(props.chequeDate, language)}
          </div>

          <div
            className="cheque-field"
            style={{
              left: `${FIELD_POSITIONS.payeeName.x}mm`,
              top: `${FIELD_POSITIONS.payeeName.y}mm`,
              width: `${FIELD_POSITIONS.payeeName.w}mm`,
              textAlign: FIELD_POSITIONS.payeeName.align,
            }}
          >
            {props.payeeName}
          </div>

          <div
            className="cheque-field"
            style={{
              left: `${FIELD_POSITIONS.amountWords.x}mm`,
              top: `${FIELD_POSITIONS.amountWords.y}mm`,
              width: `${FIELD_POSITIONS.amountWords.w}mm`,
              textAlign: FIELD_POSITIONS.amountWords.align,
            }}
          >
            {props.amountWords}
          </div>

          <div
            className="cheque-field cheque-amount-figure"
            style={{
              left: `${FIELD_POSITIONS.amountFig.x}mm`,
              top: `${FIELD_POSITIONS.amountFig.y}mm`,
              width: `${FIELD_POSITIONS.amountFig.w}mm`,
              textAlign: FIELD_POSITIONS.amountFig.align,
            }}
          >
            {money(props.amountFigure, language)}
          </div>

          {props.chequeNumber && (
            <div
              className="cheque-field cheque-cheque-number"
              style={{
                left: `${FIELD_POSITIONS.chequeNumber.x}mm`,
                top: `${FIELD_POSITIONS.chequeNumber.y}mm`,
                width: `${FIELD_POSITIONS.chequeNumber.w}mm`,
                textAlign: FIELD_POSITIONS.chequeNumber.align,
                fontSize: "9px",
                color: "#555",
              }}
            >
              {props.chequeNumber}
            </div>
          )}

          {memo && <div className="cheque-memo">Memo: {memo}</div>}
        </div>
      </div>
    );
  }
);

ChequePrintLayout.displayName = "ChequePrintLayout";
