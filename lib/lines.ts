// lib/lines.ts — helpers for the lines we represent and where we rep them
import { supabase } from '@/lib/supabase';

export type Coverage = 'full' | 'partial' | 'none' | 'unset';

export type CoverageRow = {
  vendor_id: string | number;
  state: string;
  coverage: 'full' | 'partial';
  notes: string | null;
};

// All active lines we represent, alphabetical
export async function fetchLines() {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_principal', true)
    .neq('active', false)
    .order('name');
  if (error) console.error('Error loading lines:', error.message);
  return data || [];
}

export async function fetchCoverage(): Promise<CoverageRow[]> {
  const { data, error } = await supabase
    .from('line_coverage')
    .select('vendor_id, state, coverage, notes');
  if (error) console.error('Error loading coverage:', error.message);
  return (data as CoverageRow[]) || [];
}

// Do we rep this line in this state?
//   'unset' = nobody has entered coverage for this line yet
export function coverageFor(rows: CoverageRow[], vendorId: string | number, state?: string | null): { coverage: Coverage; notes: string | null } {
  const forLine = rows.filter(r => String(r.vendor_id) === String(vendorId));
  if (forLine.length === 0) return { coverage: 'unset', notes: null };
  const match = state ? forLine.find(r => r.state === state) : undefined;
  if (!match) return { coverage: 'none', notes: null };
  return { coverage: match.coverage, notes: match.notes };
}
