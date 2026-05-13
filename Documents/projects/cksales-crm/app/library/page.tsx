import Link from 'next/link';

const manufacturers = [
  { id: 'supco', name: 'Supco' },
  { id: 'genteq', name: 'Genteq' },
  { id: 'regal-rexnord', name: 'Regal Rexnord' },
  { id: 'aldes', name: 'Aldes' },
  { id: 'arrco', name: 'Arrco' },
  { id: 'kepler-x', name: 'Kepler X' },
  { id: 'lh-dottie', name: 'LH Dottie' },
];

export default function LibraryPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-black text-gray-900 mb-10">Technical Library</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {manufacturers.map((mfg) => (
          <Link key={mfg.id} href={`/library/${mfg.id}`}>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-blue-500 transition-all cursor-pointer group shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 uppercase">{mfg.name}</h2>
              <p className="text-blue-600 text-sm mt-2 font-bold group-hover:underline">View Docs →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}