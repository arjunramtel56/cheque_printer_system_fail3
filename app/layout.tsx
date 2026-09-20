import type { Metadata } from "next";
import "./globals.css";
import "./print.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Reactify Cheque Printer System",
  description: "Prepare and print Nepalese bank cheques with calibrated templates and precise alignment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <html lang="en" className="h-full" suppressHydrationWarning>
          <head>
            <meta name="color-scheme" content="light dark" />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function(){
                    try {
                      var tKey='chequePrintTheme', tPref='system';
                      var t = localStorage.getItem(tKey);
                      if (t==='light'||t==='dark'||t==='system') tPref=t;
                      var d = tPref;
                      if (tPref==='system') {
                        d = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                      }
                      document.documentElement.setAttribute('data-theme', d);
                      document.documentElement.setAttribute('data-theme-preference', tPref);
                    } catch(e) {}
                  })();
                `,
              }}
            />
          </head>
          <body className="h-full">
            {children}
          </body>
        </html>
      </ThemeProvider>
    </LanguageProvider>
  );
}
