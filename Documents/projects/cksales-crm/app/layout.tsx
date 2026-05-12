import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HVAC CRM",
  description: "Sales & Technical Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen bg-gray-100 text-slate-900">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col">
          <div className="p-6 text-xl font-bold border-b border-slate-800">
            HVAC <span className="text-blue-400">CRM</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <a href="/" className="block p-3 rounded bg-blue-600">Dashboard</a>
            <a href="/accounts" className="block p-3 rounded hover:bg-slate-800">Accounts</a>
            <a href="/library" className="block p-3 rounded hover:bg-slate-800">Tech Library</a>
            <a href="/leads" className="block p-3 rounded hover:bg-slate-800">Leads</a>
          </nav>
          <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
            v1.0.0 Ground Up
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}