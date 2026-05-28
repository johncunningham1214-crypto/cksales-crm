import type { Metadata } from 'next';
import './globals.css';
import GlobalSearch from './components/GlobalSearch';
import Link from 'next/link';

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
        
        {/* TOP NAVIGATION BAR */}
        <nav className="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
          <div className="px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link href="/">
              <span className="font-black text-xl text-blue-600 tracking-tight hover:opacity-80">
                Field Command
              </span>
            </Link>
            
            {/* The Global Search Bar */}
            <div className="w-full sm:w-auto flex-1 sm:max-w-md flex justify-end">
              <GlobalSearch />
            </div>
          </div>
        </nav>

        {/* MAIN APP CONTAINER */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* SIDEBAR (Hidden on tiny mobile screens, visible on tablets/desktops) */}
          <aside className="w-64 bg-gray-900 text-white flex-shrink-0 overflow-y-auto hidden md:block">
  <nav className="p-4 space-y-2 mt-4">
    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">Menu</div>
    <Link href="/" className="block px-4 py-2.5 hover:bg-gray-800 rounded-lg font-medium transition-colors">
      📊 Dashboard
    </Link>
    <Link href="/accounts" className="block px-4 py-2.5 hover:bg-gray-800 rounded-lg font-medium transition-colors">
      🏢 Accounts
    </Link>
    <Link href="/routing" className="block px-4 py-2.5 hover:bg-gray-800 rounded-lg font-medium transition-colors">
      🗺️ Territory Routing
    </Link>
    <Link href="/contacts" className="block px-4 py-2.5 hover:bg-gray-800 rounded-lg font-medium transition-colors">
      👥 Contacts
    </Link>
    <Link href="/tasks" className="block px-4 py-2.5 hover:bg-gray-800 rounded-lg font-medium transition-colors">
      ✅ Tasks
    </Link>
    <Link href="/library" className="block px-4 py-2.5 hover:bg-gray-800 rounded-lg font-medium transition-colors">
      📚 Tech Library
    </Link>
  </nav>
</aside>

          {/* SCROLLABLE PAGE CONTENT */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}