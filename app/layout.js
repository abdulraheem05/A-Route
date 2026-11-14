import './globals.css';

export const metadata = {
  title: 'A-ROUTE — Know the Ground',
  description:
    'A cinematic, scientifically oriented Mars exploration platform. Phase 1: introduction and destination selection.',
  applicationName: 'A-ROUTE',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-bone antialiased">{children}</body>
    </html>
  );
}
