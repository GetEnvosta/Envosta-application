import { SettingsTabs } from './settings-tabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plans, pricing, TLDs, and integrations — edit in place without touching SQL.</p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
