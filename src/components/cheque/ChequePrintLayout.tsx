"use client";

import { forwardRef, useMemo } from "react";
import {
  A4,
  CHEQUE,
  CROSSING_CENTER_Y_MM,
  DEFAULT_PLACEMENT,
  FIELD_POSITIONS,
} from "@/lib/cheque/constants";
import { formatDateDigits } from "@/lib/amount-to-words";

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

    // DDMMYYYY — one digit per pre-printed date box, no separators.
    const dateDigits = formatDateDigits(props.chequeDate);

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
          {accountPayeeOnly && (
            <div className="cheque-crossing" style={{ top: `${CROSSING_CENTER_Y_MM}mm` }}>
              A/C PAYEE ONLY
            </div>
          )}

          {/* Date: eight individual digit boxes (DDMMYYYY), top right */}
          <div
            className="cheque-date-row"
            style={{
              left: `${FIELD_POSITIONS.date.x}mm`,
              top: `${FIELD_POSITIONS.date.y}mm`,
              width: `${FIELD_POSITIONS.date.w}mm`,
              height: `${FIELD_POSITIONS.date.h}mm`,
            }}
          >
            {Array.from({ length: FIELD_POSITIONS.date.boxes }).map((_, i) => (
              <div key={i} className="cheque-date-box">
                {dateDigits[i] ?? ""}
              </div>
            ))}
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

          {/* Amount box on the right of the beneficiary line */}
          <div
            className="cheque-amount-box"
            style={{
              left: `${FIELD_POSITIONS.amountFig.x}mm`,
              top: `${FIELD_POSITIONS.amountFig.y}mm`,
              width: `${FIELD_POSITIONS.amountFig.w}mm`,
              height: `${FIELD_POSITIONS.amountFig.h}mm`,
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
