"use client";

import React from "react";

export interface ChequeSheetProps {
  date: string;
  payeeName: string;
  amountInWords: string;
  amount: string;
  className?: string;
}

export default function ChequeSheet({
  date,
  payeeName,
  amountInWords,
  amount,
  className = "",
}: ChequeSheetProps) {
  return (
    <div className={`cheque-print ${className}`.trim()}>
      <img
        src="/templates/siddhartha-bank-cheque.png"
        alt="Cheque template"
        className="cheque-background"
      />

      <div className="field cheque-date">{date}</div>
      <div className="field cheque-payee">{payeeName}</div>
      <div className="field cheque-words">{amountInWords}</div>
      <div className="field cheque-number">Rs. {amount}</div>
    </div>
  );
}
