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
  <nav className="space-y-1.5 px-4">
  {/* Dashboard */}
  <Link 
    href="/" 
    className="flex items-center gap-3 px-4 py-3 text-gray-100 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors"
  >
    <span className="w-6 text-center text-lg">📊</span>
    <span>Dashboard</span>
  </Link>

  {/* Schedule */}
  <Link 
    href="/calendar" 
    className="flex items-center gap-3 px-4 py-3 text-gray-100 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors"
  >
    <span className="w-6 text-center text-lg">🗓️</span>
    <span>Schedule</span>
  </Link>

  {/* Tasks */}
  <Link 
    href="/tasks" 
    className="flex items-center gap-3 px-4 py-3 text-gray-100 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors"
  >
    <span className="w-6 text-center text-lg">⚡</span>
    <span>Tasks</span>
  </Link>

  {/* Accounts Directory */}
  <Link 
    href="/accounts" 
    className="flex items-center gap-3 px-4 py-3 text-gray-100 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors"
  >
    <span className="w-6 text-center text-lg">🏢</span>
    <span>Accounts</span>
  </Link>

  {/* Log Visit */}
  <Link 
    href="/calls/new" 
    className="flex items-center gap-3 px-4 py-3 text-gray-100 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors"
  >
    <span className="w-6 text-center text-lg">📍</span>
    <span>Log Visit</span>
  </Link>

  {/* Tech Library - RESTORED */}
  <Link 
    href="/tech-library" 
    className="flex items-center gap-3 px-4 py-3 text-gray-100 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors"
  >
    <span className="w-6 text-center text-lg">📚</span>
    <span>Tech Library</span>
  </Link>

  {/* Generate Report */}
  <Link 
    href="/calls/new/report" 
    className="flex items-center gap-3 px-4 py-3 text-gray-100 font-bold rounded-xl hover:bg-white/10 hover:text-white transition-colors"
  >
    <span className="w-6 text-center text-lg">📋</span>
    <span>Generate Report</span>
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