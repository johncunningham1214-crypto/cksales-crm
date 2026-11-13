# Phase 1 install: Lines, Territory Coverage, Branch White Space

## What this adds
- **Lines page** (`/lines`): your manufacturers, with a tap-to-set state map (Full / Partial / not ours) and rep-agreement details (commission %, renewal date, factory contact, goal, focus products).
- **"Our Lines Here" card on every branch**: shows only the lines you rep in that branch's state. Partial states are labeled ("Partial NY: Upstate only"), and those branches get a **"Not our area"** option. Reps mark each line as Stocks it / Doesn't stock / Working on it / Lost it.
- **New Account form**: now has the state dropdown (required for branches), address, and assigned salesmen, and opens the new branch when you save.
- **Constants**: all 15 lines, plus visit types that match the visit form.

It builds on your existing `vendors` table, so the Tech Library and Lines stay in sync.

## Steps

### 1. Run the SQL
Supabase → SQL Editor → paste `supabase/phase1_lines.sql` → Run.
Then open Table Editor → `vendors` and check for duplicates (e.g. "Nu-Calgon" vs "NuCalgon").
If you find one, delete the extra row and make sure the remaining name matches `lib/constants.ts` exactly.

### 2. Copy in the new and replaced files
| File | Action |
|---|---|
| `lib/constants.ts` | replace |
| `lib/lines.ts` | new |
| `app/lines/page.tsx` | new |
| `app/lines/[id]/page.tsx` | new |
| `app/components/BranchLines.tsx` | new |
| `app/accounts/new/page.tsx` | replace |

### 3. Two small edits

**`app/accounts/[id]/page.tsx`**: add the import at the top:
```tsx
import BranchLines from '@/app/components/BranchLines';
```
Then, in the LEFT COLUMN, put this right above the HQ Contacts card (just after `<div className="lg:col-span-1 space-y-6">`):
```tsx
{!account.is_parent && (
  <BranchLines accountId={account.id} territory={account.territory} />
)}
```

**`app/ClientLayout.tsx`**: in `NavLinks`, add this right after the Accounts link:
```tsx
<Link href="/lines" className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${pathname.startsWith('/lines') ? 'bg-blue-600 text-white' : 'text-gray-100 hover:bg-white/10 hover:text-white'}`}>
  <span className="w-6 text-center text-lg">🏭</span><span>Our Lines</span>
</Link>
```

### 4. Test
1. `npm run dev`, then open **Our Lines** → pick a line → tap states → Save.
2. Open a branch in a covered state. You should see the "Our Lines Here" card.
3. Set a line to Partial in a branch's state. The branch should show the partial note and offer "Not our area".

## Notes
- **Branches without a state** show every line with a warning. Fill in the state on existing branches.
- **A line with no coverage entered** still shows on every branch, marked "Territory not set up", so nothing disappears before your dad's info is in.
- **Visit history:** old visits keep their vendor names. Nothing is migrated or lost.
- **Partial coverage is per state, with a note.** For lines split inside a state, reps mark the branches outside your area as "Not our area" once. If you later need county-level precision, that can be added without redoing this.
