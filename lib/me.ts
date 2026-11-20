// lib/me.ts — who is logged in, as a salesman name.
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const ME_CHANGED = 'cksales:me-changed';   // fired after someone links their name
export const OPEN_WHO_ARE_YOU = 'cksales:who-are-you'; // ask the gate to open again

export type Me = { email: string | null; name: string | null; loading: boolean };

export async function fetchMe(): Promise<{ email: string | null; name: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email?.toLowerCase() || null;
  if (!email) return { email: null, name: null };
  const { data } = await supabase.from('team_members').select('name').eq('email', email).maybeSingle();
  return { email, name: data?.name || null };
}

export function useMe(): Me {
  const [me, setMe] = useState<Me>({ email: null, name: null, loading: true });

  useEffect(() => {
    let alive = true;
    const load = () => fetchMe().then(m => { if (alive) setMe({ ...m, loading: false }); });
    load();
    window.addEventListener(ME_CHANGED, load);
    return () => { alive = false; window.removeEventListener(ME_CHANGED, load); };
  }, []);

  return me;
}
