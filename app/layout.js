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
  // Lets the interface draw into the notch and home-indicator areas; every
  // mobile panel then pads itself back out with env(safe-area-inset-*).
  // Pinch-zoom is deliberately left enabled for accessibility — the map and
  // the game canvases opt out of browser gestures themselves with
  // `touch-action: none` so their own pan and zoom still work.
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-black">
      <body className="bg-black text-bone antialiased">{children}</body>
    </html>
  );
}
