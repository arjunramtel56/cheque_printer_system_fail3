import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reactify Cheque Printer System',
  description: 'Prepare and print Nepalese bank cheques with calibrated templates and precise alignment.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
