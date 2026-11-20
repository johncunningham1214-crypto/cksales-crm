// lib/dates.ts — dates in the user's own time zone.
// (toISOString() gives UTC, which rolls over to tomorrow after 7pm Eastern.)
export const localISODate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
