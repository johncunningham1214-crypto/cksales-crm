export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
      <p className="text-gray-500 mb-8">Here is what is happening in your territory.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-xl shadow-sm border">
          <h3 className="text-gray-400 text-sm uppercase">Total Accounts</h3>
          <p className="text-2xl font-bold">24</p>
        </div>
        {/* ... other metric cards ... */}
      </div>
    </div>
  );
}