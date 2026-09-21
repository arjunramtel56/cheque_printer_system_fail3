"use client";

import { FormEvent, useState } from "react";
import {
  CalendarDays,
  FileText,
  Printer,
  RotateCcw,
  UserRound,
} from "lucide-react";

export default function NewChequePage() {
  const [payeeName, setPayeeName] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  const [amount, setAmount] = useState("");

  function clearForm() {
    setPayeeName("");
    setChequeDate("");
    setAmountInWords("");
    setAmount("");
  }

  function handlePrint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.print();
  }

  function handleAmountChange(value: string) {
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-7 no-print">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <FileText size={14} />
            Cheque Management
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            Create New Cheque
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Fill in the details and preview your cheque before printing.
          </p>
        </div>

        {/* Two-Column Layout: Preview left, Form right (desktop) / Form top, Preview bottom (mobile) */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Cheque Preview */}
          <section className="order-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:order-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 no-print">
              <div>
                <h2 className="font-bold text-slate-900">
                  Cheque Preview
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Verify details before printing
                </p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                Live Preview
              </span>
            </div>

            <div className="flex min-h-[300px] items-center justify-center overflow-auto bg-slate-50 p-4 md:p-6">
              <div className="cheque-preview">
                <img
                  src="/images/siddhartha-bank-cheque.png"
                  alt="Cheque preview"
                  className="cheque-background"
                />
                <span className="cheque-date">
                  {formatDate(chequeDate)}
                </span>
                <span className="cheque-payee">
                  {payeeName || "Payee Name"}
                </span>
                <span className="cheque-amount-words">
                  {amountInWords || "Amount in words"}
                </span>
                <span className="cheque-amount-number">
                  Rs. {amount || "0.00"}
                </span>
              </div>
            </div>

            <p className="pt-3 text-center text-xs text-slate-400 no-print">
              What you see in the preview is what will be printed.
            </p>
          </section>

          {/* Cheque Form */}
          <aside className="order-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:order-2">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <FileText size={21} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    Cheque Details
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter your cheque information
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePrint} className="space-y-5 pt-5">
              {/* Payee Name */}
              <div>
                <label
                  htmlFor="payeeName"
                  className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <UserRound size={16} className="text-slate-400" />
                  Payee Name
                </label>
                <p className="mb-2 text-xs text-slate-400">
                  भुक्तानी पाउने व्यक्तिको नाम
                </p>
                <input
                  id="payeeName"
                  type="text"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="e.g. Ram Bahadur"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* Cheque Date */}
              <div>
                <label
                  htmlFor="chequeDate"
                  className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <CalendarDays size={16} className="text-slate-400" />
                  Cheque Date
                </label>
                <p className="mb-2 text-xs text-slate-400">
                  Cheque मिति
                </p>
                <input
                  id="chequeDate"
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {/* Amount in Words */}
              <div>
                <label
                  htmlFor="amountInWords"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Amount in Words
                </label>
                <p className="mb-2 text-xs text-slate-400">
                  रकम अक्षरमा
                </p>
                <textarea
                  id="amountInWords"
                  value={amountInWords}
                  onChange={(e) => setAmountInWords(e.target.value)}
                  placeholder="Ninety-Nine Thousand Rupees Only"
                  rows={3}
                  required
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {amountInWords.length}/100
                </p>
              </div>

              {/* Amount in Number */}
              <div>
                <label
                  htmlFor="amount"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Amount in Number
                </label>
                <p className="mb-2 text-xs text-slate-400">
                  रकम अंकमा
                </p>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
                  <span className="flex items-center border-r border-slate-200 px-4 text-sm font-bold text-slate-500">
                    Rs.
                  </span>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    required
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RotateCcw size={16} />
                    Clear
                  </button>
                  <button
                    type="submit"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
                  >
                    <Printer size={17} />
                    Print Cheque
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .cheque-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 8.5 / 3.5;
          overflow: hidden;
          background: white;
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.12);
        }

        .cheque-background {
          position: absolute;
          inset: 0;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: fill;
        }

        .cheque-date,
        .cheque-payee,
        .cheque-amount-words,
        .cheque-amount-number {
          position: absolute;
          z-index: 2;
          color: #111827;
          font-family: Arial, sans-serif;
          line-height: 1.15;
        }

        .cheque-date {
          top: 8%;
          right: 8%;
          font-size: clamp(7px, 1.25vw, 13px);
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .cheque-payee {
          top: 35%;
          left: 18%;
          max-width: 60%;
          overflow: hidden;
          font-size: clamp(7px, 1.3vw, 14px);
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cheque-amount-words {
          top: 48%;
          left: 18%;
          max-width: 53%;
          font-size: clamp(6px, 1.1vw, 12px);
          font-weight: 500;
          overflow-wrap: break-word;
        }

        .cheque-amount-number {
          top: 48%;
          right: 10%;
          font-size: clamp(7px, 1.25vw, 14px);
          font-weight: 700;
          white-space: nowrap;
        }

        @page {
          size: 8.5in 3.5in;
          margin: 0;
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .no-print,
          form,
          aside,
          header,
          nav,
          button {
            display: none !important;
          }

          body * {
            visibility: hidden;
          }

          .cheque-preview,
          .cheque-preview * {
            visibility: visible;
          }

          .cheque-preview {
            position: absolute;
            top: 0;
            left: 0;
            width: 8.5in;
            height: 3.5in;
            margin: 0;
            box-shadow: none;
            page-break-after: avoid;
          }

          .cheque-background {
            width: 8.5in;
            height: 3.5in;
          }

          .cheque-date {
            font-size: 12px;
          }

          .cheque-payee {
            font-size: 13px;
          }

          .cheque-amount-words {
            font-size: 11px;
          }

          .cheque-amount-number {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}

function formatDate(date: string) {
  if (!date) {
    return "DDMMYYYY";
  }

  const [year, month, day] = date.split("-");

  return `${day}${month}${year}`;
}
