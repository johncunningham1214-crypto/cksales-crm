"use client";

// One-time "Which one is you?" step. Links this login's email to a
// salesman name for good (only an admin can change it afterward).

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SALES_TEAM } from '@/lib/constants';
import { fetchMe, ME_CHANGED, OPEN_WHO_ARE_YOU } from '@/lib/me';

export default function WhoAreYou() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [picked, setPicked] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false); // blocks a second tap before the screen updates
  const [error, setError] = useState('');

  useEffect(() => {
    async function check(force = false) {
      const me = await fetchMe();
      if (!me.email || me.name) return;
      // "Not on the list" hides the prompt until the next sign-in, unless asked to reopen
      if (!force && sessionStorageGet('cksales:who-skip') === me.email) return;
      const { data } = await supabase.from('team_members').select('name');
      setTaken((data || []).map((r: any) => r.name));
      setEmail(me.email);
      setOpen(true);
    }
    check();
    const reopen = () => check(true);
    window.addEventListener(OPEN_WHO_ARE_YOU, reopen);
    return () => window.removeEventListener(OPEN_WHO_ARE_YOU, reopen);
  }, []);

  async function confirm() {
    if (!picked || !email) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setError('');
    const { error } = await supabase.from('team_members').insert([{ email, name: picked }]);
    if (error) {
      setError(error.code === '23505'
        ? `${picked} is already linked to another login. If that's wrong, ask John to fix it.`
        : 'Could not save: ' + error.message);
      savingRef.current = false;
      setIsSaving(false);
      return;
    }
    setOpen(false);
    window.dispatchEvent(new Event(ME_CHANGED));
  }

  function skip() {
    if (email) sessionStorageSet('cksales:who-skip', email);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-gray-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Which one is you?</h2>
          <p className="text-sm text-gray-600 mt-1">
            One time only. This links <b>{email}</b> to your name, so the app can show your stops, tasks and accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {SALES_TEAM.map(name => {
            const isTaken = taken.includes(name);
            return (
              <button
                key={name}
                type="button"
                disabled={isTaken}
                onClick={() => setPicked(name)}
                className={`text-left border-2 rounded-xl px-4 py-3 font-bold transition-colors ${
                  picked === name ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : isTaken ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                  : 'border-gray-200 text-gray-800 hover:border-blue-300'}`}
              >
                {name}{isTaken && <span className="text-xs font-medium ml-2">already linked</span>}
              </button>
            );
          })}
        </div>

        {picked && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            You&apos;re <b>{picked}</b>? This can&apos;t be changed later without asking John.
          </p>
        )}
        {error && <p className="text-sm font-bold text-red-700">{error}</p>}

        <button
          type="button"
          disabled={!picked || isSaving}
          onClick={confirm}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : picked ? `Yes, I'm ${picked}` : 'Pick your name'}
        </button>
        <button type="button" onClick={skip} className="w-full text-sm font-bold text-gray-500 py-2">
          I&apos;m not on this list
        </button>
      </div>
    </div>
  );
}

// sessionStorage can throw in some private-browsing modes
function sessionStorageGet(k: string) { try { return window.sessionStorage.getItem(k); } catch { return null; } }
function sessionStorageSet(k: string, v: string) { try { window.sessionStorage.setItem(k, v); } catch { /* ignore */ } }
