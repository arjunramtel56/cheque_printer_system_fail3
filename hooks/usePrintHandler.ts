import { useRef } from 'react';

export function usePrintHandler() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    // Optimize for print: hide interactive elements
    const originalStyles = {
      userSelect: document.body.style.userSelect,
      pointerEvents: document.body.style.pointerEvents,
      overflow: document.body.style.overflow,
    };
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
    document.body.style.overflow = 'hidden';

    window.print();

    // Restore styles
    document.body.style.userSelect = originalStyles.userSelect;
    document.body.style.pointerEvents = originalStyles.pointerEvents;
    document.body.style.overflow = originalStyles.overflow;
  };

  const handlePreview = () => {
    if (!printRef.current) return;
    
    // Open print preview in new window with same content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const content = printRef.current.innerHTML;
    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Print Preview - Cheque</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              margin: 0; 
              padding: 20px;
              font-family: "Inter", sans-serif;
            }
            ${document.querySelector('style')?.textContent || ''}
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
    
    printWindow.document.write(fullHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  return { printRef, handlePrint, handlePreview };
}

