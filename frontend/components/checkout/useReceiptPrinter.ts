import { useCallback } from 'react';

/**
 * Prints the #receipt-print-area DOM node through a hidden iframe so thermal
 * receipt printing works reliably from a modal without pop-up blockers.
 * Extracted verbatim from the original Checkout.tsx.
 */
export function useReceiptPrinter(saleNo?: string) {
  return useCallback(() => {
    const printArea = document.getElementById('receipt-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    let printIframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement | null;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'receipt-print-iframe';
      printIframe.style.position = 'absolute';
      printIframe.style.width = '0px';
      printIframe.style.height = '0px';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Thermal Receipt - ${saleNo || 'Receipt'}</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 10px;
                background: #ffffff;
                color: #000000;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.4;
              width: 80mm;
              margin: 0 auto;
              color: #000000;
              background: #ffffff;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .pt-1 { padding-top: 4px; }
            .font-extrabold { font-weight: 800; }
            .font-semibold { font-weight: 600; }
            .text-sm { font-size: 13px; }
            .text-red-600 { color: #000000; }
            .text-slate-500 { color: #000000; }
            .text-slate-400 { color: #000000; }
            .border-t { border-top: 1px solid #000000; }
            .border-dashed { border-style: dashed; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .gap-4 { gap: 16px; }
            .gap-6 { gap: 24px; }
            .logo-img {
              max-height: 40px;
              max-width: 140px;
              object-fit: contain;
              display: block;
              margin: 0 auto 8px auto;
            }
          </style>
        </head>
        <body>
          <div style="width: 76mm; margin: 0 auto;">
            ${printArea.innerHTML}
          </div>
          <script>
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
  }, [saleNo]);
}
