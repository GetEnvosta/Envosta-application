export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" />

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-36 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* Auto-renew */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-56 bg-gray-200 rounded" />
          </div>
          <div className="h-6 w-11 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* DNS section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* Nameservers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
