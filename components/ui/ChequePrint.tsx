import { usePrintHandler } from '@/hooks/usePrintHandler';
import Image from 'next/image';

interface ChequePrintProps {
  bankDetails?: {
    name: string;
    logo?: string;
  };
  payee: string;
  amount: number;
  amountInWords: string;
  chequeNumber: string;
  date?: string;
}

export default function ChequePrint({
  bankDetails,
  payee,
  amount,
  amountInWords,
  chequeNumber,
  date,
}: ChequePrintProps) {
  const { printRef, handlePrint, handlePreview } = usePrintHandler();

  const formatDate = (d?: string) => {
    if (!d) return new Date().toLocaleDateString('en-IN');
    return new Date(d).toLocaleDateString('en-IN');
  };

  return (
    <div className="w-full">
      <div ref={printRef} className="cheque-preview max-w-2xl mx-auto mb-6">
        {/* Cheque background pattern */}
        <div className="relative w-[8.5in] h-[3.5in] bg-white border border-gray-300 rounded-lg overflow-hidden">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-[48px] font-bold">REACTIFY</span>
          </div>

          <div className="relative h-full p-8 flex flex-col justify-between">
            {/* Top section */}
            <div className="flex justify-between items-start">
              <div className="w-1/4">
                {bankDetails?.logo && (
                  <Image
                    src={bankDetails.logo}
                    alt={bankDetails.name}
                    width={80}
                    height={40}
                    className="object-contain"
                  />
                )}
                <p className="font-bold text-sm mt-2">{bankDetails?.name || 'BANK NAME'}</p>
              </div>
              
              <div className="w-3/4 text-right">
                <p className="font-mono text-xs mb-1">Cheque No: {chequeNumber}</p>
              </div>
            </div>

            {/* Middle section */}
            <div className="flex-1 flex items-center">
              <div className="w-full">
                <p className="text-lg mb-4">Pay to the order of:</p>
                <p className="font-bold text-xl mb-4">{payee || 'Payee Name'}</p>
                
                <div className="mt-8">
                  <p className="font-mono text-sm mb-2">NRs. {amount.toFixed(2)}</p>
                  <p className="text-sm italic">{amountInWords || 'Amount in words'}</p>
                </div>
              </div>
            </div>

            {/* Bottom section */}
            <div className="flex justify-between items-end">
              <div className="w-1/3">
                <p className="text-xs font-mono mb-8 pb-12 border-b border-gray-300">&nbsp;</p>
                <p className="text-[10px] text-gray-500">Account No.</p>
              </div>
              
              <div className="w-1/3 text-right">
                <p className="text-xs mb-1">Date</p>
                <p className="font-mono text-sm">{formatDate(date)}</p>
              </div>
              
              <div className="w-1/3 text-right">
                <p className="text-xs mb-1">Amount</p>
                <p className="font-bold text-xl font-mono">₨ {amount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Controls */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handlePreview}
          className="button secondary"
        >
          Preview
        </button>
        <button
          onClick={handlePrint}
          className="button"
        >
          Print Cheque
        </button>
      </div>
    </div>
  );
}

