import './globals.css';

export const metadata = {
  title: 'A-ROUTE',
  description:
    'A cinematic, scientifically oriented Mars exploration platform. Phase 1: introduction and destination selection.',
  applicationName: 'A-ROUTE',

  icons: {
    icon: '/screenshots/A-ROUTE Icon.png',
    shortcut: '/screenshots/A-ROUTE Icon.png',
    apple: '/screenshots/A-ROUTE Icon.png',
  },
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
