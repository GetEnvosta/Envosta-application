export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-64 bg-gray-100 rounded mb-8" />

      {/* Profile section skeleton */}
      <div className="card p-6 max-w-2xl mb-6">
        <div className="h-5 w-20 bg-gray-200 rounded mb-6" />
        <div className="flex items-center gap-4 mb-6">
          <div className="h-20 w-20 bg-gray-200 rounded-full" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg" />
        </div>
        <div className="space-y-5">
          <div>
            <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-14 bg-gray-200 rounded mb-2" />
            <div className="h-5 w-48 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Password section skeleton */}
      <div className="card p-6 max-w-2xl mb-6">
        <div className="h-5 w-36 bg-gray-200 rounded mb-6" />
        <div className="space-y-5">
          <div>
            <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Notifications skeleton */}
      <div className="card p-6 max-w-2xl mb-6">
        <div className="h-5 w-48 bg-gray-200 rounded mb-6" />
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-6 w-11 bg-gray-200 rounded-full" />
              <div>
                <div className="h-4 w-36 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-52 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
          <div className="h-10 w-32 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Danger zone skeleton */}
      <div className="card p-6 max-w-2xl border-red-200">
        <div className="h-5 w-28 bg-red-100 rounded mb-2" />
        <div className="h-4 w-72 bg-red-50 rounded mb-4" />
        <div className="h-10 w-32 bg-red-100 rounded-lg" />
      </div>
    </div>
  );
}
