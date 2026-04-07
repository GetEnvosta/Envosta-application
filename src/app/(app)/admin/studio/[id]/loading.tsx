export default function StudioEditorLoading() {
  return (
    <div>
      <div className="h-4 bg-gray-100 rounded w-24 mb-4 animate-pulse" />
      <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse" />
      <div className="flex gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 bg-gray-100 rounded-lg w-20 animate-pulse" />
        ))}
      </div>
      <div className="card p-6 h-[500px] animate-pulse bg-gray-50" />
    </div>
  );
}
