"use client";

// "Share with the team" option on the Log Visit / Edit Visit forms.

type Props = {
  shared: boolean;
  setShared: (v: boolean) => void;
  headline: string;
  setHeadline: (v: string) => void;
  companyName?: string | null; // parent company the visit will be pinned to
};

export default function ShareToggle({ shared, setShared, headline, setHeadline, companyName }: Props) {
  return (
    <div className={`rounded-xl border p-5 transition-colors ${shared ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={shared}
          onChange={(e) => setShared(e.target.checked)}
          className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-600 cursor-pointer"
        />
        <span>
          <span className="block font-bold text-gray-900">Share with the team</span>
          <span className="block text-sm text-gray-600">
            {companyName
              ? <>Pins this visit to every <b>{companyName}</b> branch and adds it to Team Notes.</>
              : 'Adds this visit to Team Notes.'}
          </span>
        </span>
      </label>

      {shared && (
        <div className="mt-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">What should the team know? (optional)</label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={140}
            placeholder="e.g. Counter day with a leak detector demo got Inficon added to stock"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
          />
          <p className="text-xs text-gray-500 mt-1.5">Your visit notes are shared too. Leave this blank to share just the notes.</p>
        </div>
      )}
    </div>
  );
}
