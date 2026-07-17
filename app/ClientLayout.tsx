"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';
import GlobalSearch from './components/GlobalSearch';
import Link from 'next/link';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: State to control the mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (isMounted) {
          setSession(session);
          if (!session && pathname !== '/login') router.push('/login');
          else if (session && pathname === '/login') router.push('/');
        }
      } catch (err) {
        console.error("Auth check failed. This usually means you are on an unsecure HTTP connection:", err);
        // If it crashes, boot them to login so they aren't stuck loading
        if (pathname !== '/login') router.push('/login');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        if (!session && pathname !== '/login') {
          router.push('/login');
        } else if (session && pathname === '/login') {
          router.push('/');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // NEW: Close the mobile menu whenever the route changes (when a user clicks a link)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <span className="text-4xl mb-4">📊</span>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Loading Field Command...</h2>
        </div>
      </div>
    );
  }

  if (pathname === '/login') {
    return <main className="flex-1 overflow-y-auto w-full">{children}</main>;
  }

  // Helper component for the navigation links so we don't repeat code!
  const NavLinks = () => (
    <>
      <Link href="/" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname === '/' ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
        <span className="w-6 text-center text-lg">📊</span><span>Dashboard</span>
      </Link>
      <Link href="/calendar" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname.includes('/calendar') ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
        <span className="w-6 text-center text-lg">🗓️</span><span>Schedule</span>
      </Link>
      <Link href="/tasks" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname.includes('/tasks') ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
        <span className="w-6 text-center text-lg">⚡</span><span>Tasks</span>
      </Link>
      <Link href="/accounts" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname.includes('/accounts') ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
        <span className="w-6 text-center text-lg">🏢</span><span>Accounts</span>
      </Link>
      <Link href="/calls/new" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname === '/calls/new' ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
        <span className="w-6 text-center text-lg">📍</span><span>Log Visit</span>
      </Link>
      <Link href="/tech-library" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname.includes('/tech-library') ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
        <span className="w-6 text-center text-lg">📚</span><span>Tech Library</span>
      </Link>
      <Link href="/calls/new/report" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname.includes('/report') ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
        <span className="w-6 text-center text-lg">📋</span><span>Generate Report</span>
      </Link>
    </>
  );

  return (
    <>
      {/* TOP NAVIGATION BAR */}
      <nav className="bg-white border-b border-gray-200 shrink-0 z-40 shadow-sm relative">
        <div className="px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              {/* NEW: Mobile Hamburger Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              
              <Link href="/">
                <span className="font-black text-xl text-blue-600 tracking-tight hover:opacity-80">
                  Field Command
                </span>
              </Link>
            </div>
          </div>
          
          <div className="w-full sm:w-auto flex-1 sm:max-w-md flex justify-end">
            <GlobalSearch />
          </div>
        </div>
      </nav>

      {/* NEW: MOBILE SLIDE-OUT MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Dark background overlay */}
          <div 
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Slide-out Sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900 shadow-2xl transform transition-transform ease-in-out duration-300">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button 
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-gray-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="text-white font-bold">✕</span>
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-8 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-6 mb-6">
                <span className="text-2xl font-black text-white">Menu</span>
              </div>
              <nav className="px-4 space-y-1.5">
                <NavLinks />
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-800 p-4">
              <button 
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-gray-400 font-bold rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
              >
                <span className="w-6 text-center text-lg">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN APP CONTAINER */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="w-64 bg-gray-900 text-white flex-shrink-0 overflow-y-auto hidden md:flex flex-col z-10">
          <nav className="space-y-1.5 px-4 py-6 flex-1">
            <NavLinks />
          </nav>

          <div className="p-4 border-t border-gray-800">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 text-gray-400 font-bold rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
            >
              <span className="w-6 text-center text-lg">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </>
  );
}
// --- END OF FILE ---