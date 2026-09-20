import type { Metadata } from "next";
import "./globals.css";
import "./print.css";

export const metadata: Metadata = {
  title: "Reactify Cheque Printer System",
  description: "Prepare and print Nepalese bank cheques with calibrated templates and precise alignment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var k='chequePrintTheme', p='system';
                  var r=localStorage.getItem(k);
                  if (r==='light'||r==='dark'||r==='system') p=r;
                  var d=p;
                  if (p==='system') {
                    d=window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', d);
                  document.documentElement.setAttribute('data-theme-preference', p);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
