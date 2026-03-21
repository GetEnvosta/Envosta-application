'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}

export default function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          } mt-0.5`}
        />
      </button>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
          {label}
        </span>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}
