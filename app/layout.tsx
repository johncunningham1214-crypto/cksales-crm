import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: "HVAC Field Command",
  description: "Territory management and field notes",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 h-screen flex flex-col overflow-hidden">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
// --- END OF FILE ---