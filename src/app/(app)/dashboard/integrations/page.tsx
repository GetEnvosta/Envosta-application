'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Plug, Calendar, ChevronDown } from 'lucide-react';
import Toast from '@/components/ui/toast';

interface Integration {
  id: string;
  provider_email: string;
  status: string;
  enabled: boolean;
  last_used_at: string | null;
  connection_config: {
    calendars?: { id: string; summary: string; primary?: boolean }[];
    selected_calendar_id?: string;
    selected_calendar_name?: string;
  };
  integration_providers: {
    slug: string;
    display_name: string;
    description: string;
    category: string;
  };
}

interface ToastState { message: string; type: 'success' | 'error' | 'info' }

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  google_calendar: (
    <svg viewBox="0 0 48 48" className="w-8 h-8">
      <rect width="48" height="48" rx="8" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
      <path fill="#4285F4" d="M34 10H14a4 4 0 0 0-4 4v20a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4V14a4 4 0 0 0-4-4z" opacity=".1"/>
      <path fill="#4285F4" d="M30 8H18v4h-4v2h4v2H14v20h20V16h4v-2h-4v-2h4V8h-4zm0 4v2H18v-2h12z"/>
      <rect x="17" y="22" width="5" height="5" rx="1" fill="#EA4335"/>
      <rect x="24" y="22" width="5" height="5" rx="1" fill="#FBBC04"/>
      <rect x="17" y="29" width="5" height="5" rx="1" fill="#34A853"/>
      <rect x="24" y="29" width="5" height="5" rx="1" fill="#4285F4"/>
    </svg>
  ),
};

// Coming soon cards
const COMING_SOON = [
  { slug: 'google_my_business', name: 'Google My Business', description: 'Sync your business hours, location, and services so the AI always has accurate info.', category: 'business' },
  { slug: 'stripe', name: 'Stripe', description: 'Let the AI look up invoices or payment status when callers ask.', category: 'billing' },
  { slug: 'hubspot', name: 'HubSpot CRM', description: 'Log calls and contacts automatically after each AI conversation.', category: 'crm' },
];

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState<string | null>(null);
  const [savingCalendar, setSavingCalendar] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ message, type });
  }, []);

  async function loadIntegrations() {
    const res = await fetch('/api/integrations');
    if (res.ok) {
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadIntegrations();
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success === 'google_calendar') showToast('Google Calendar connected successfully', 'success');
    if (error === 'access_denied') showToast('Google Calendar connection was cancelled', 'info');
    if (error === 'token_exchange_failed') showToast('Failed to connect Google Calendar — please try again', 'error');
    if (error === 'invalid_state') showToast('Connection attempt expired — please try again', 'error');
  }, [searchParams, showToast]);

  async function handleDisconnect(id: string) {
    setDisconnecting(id);
    try {
      const res = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: id }),
      });
      if (res.ok) {
        showToast('Integration disconnected', 'success');
        loadIntegrations();
      } else {
        showToast('Failed to disconnect', 'error');
      }
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleCalendarChange(integrationId: string, calendarId: string, calendarName: string) {
    setSavingCalendar(integrationId);
    await fetch('/api/integrations/update-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        integrationId,
        config: { selected_calendar_id: calendarId, selected_calendar_name: calendarName },
      }),
    });
    setSavingCalendar(null);
    setCalendarOpen(null);
    loadIntegrations();
    showToast(`Active calendar set to "${calendarName}"`, 'success');
  }

  const googleCalendarIntegration = integrations.find(
    i => i.integration_providers.slug === 'google_calendar',
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Connect your tools so your AI receptionist can check availability, book appointments, and more.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Active integrations section */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Available</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {/* Google Calendar card */}
              <div className={`card p-5 flex flex-col gap-4 transition-shadow ${googleCalendarIntegration ? 'ring-1 ring-green-200' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {PROVIDER_ICONS['google_calendar']}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Google Calendar</p>
                      <p className="text-xs text-gray-400">calendar</p>
                    </div>
                  </div>
                  {googleCalendarIntegration && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Let your AI receptionist check your availability and book appointments directly into your calendar.
                </p>

                {googleCalendarIntegration ? (
                  <div className="space-y-3">
                    {/* Connected account */}
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 mb-0.5">Connected account</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {googleCalendarIntegration.provider_email}
                      </p>
                    </div>

                    {/* Calendar selector */}
                    {googleCalendarIntegration.connection_config.calendars &&
                      googleCalendarIntegration.connection_config.calendars.length > 1 && (
                      <div className="relative">
                        <p className="text-xs text-gray-500 mb-1.5">Active calendar</p>
                        <button
                          onClick={() => setCalendarOpen(calendarOpen === googleCalendarIntegration.id ? null : googleCalendarIntegration.id)}
                          className="w-full flex items-center justify-between gap-2 input py-2 text-sm text-left"
                        >
                          <span className="truncate flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {googleCalendarIntegration.connection_config.selected_calendar_name ?? 'Primary'}
                          </span>
                          {savingCalendar === googleCalendarIntegration.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />
                            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          }
                        </button>
                        {calendarOpen === googleCalendarIntegration.id && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            {googleCalendarIntegration.connection_config.calendars.map(cal => (
                              <button
                                key={cal.id}
                                onClick={() => handleCalendarChange(googleCalendarIntegration.id, cal.id, cal.summary)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                  cal.id === googleCalendarIntegration.connection_config.selected_calendar_id
                                    ? 'text-sky-600 font-medium' : 'text-gray-700'
                                }`}
                              >
                                <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                {cal.summary}
                                {cal.primary && <span className="text-xs text-gray-400">(primary)</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleDisconnect(googleCalendarIntegration.id)}
                      disabled={disconnecting === googleCalendarIntegration.id}
                      className="w-full btn-secondary text-xs py-1.5 text-red-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
                    >
                      {disconnecting === googleCalendarIntegration.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Disconnecting...</>
                        : <><XCircle className="w-3.5 h-3.5" /> Disconnect</>
                      }
                    </button>
                  </div>
                ) : (
                  <a href="/api/integrations/google/connect" className="btn-primary text-sm justify-center">
                    <Plug className="w-4 h-4" /> Connect Google Calendar
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Coming soon */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Coming Soon</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COMING_SOON.map(provider => (
                <div key={provider.slug} className="card p-5 flex flex-col gap-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Plug className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{provider.name}</p>
                      <p className="text-xs text-gray-400">{provider.category}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{provider.description}</p>
                  <div className="btn-secondary text-xs py-1.5 text-center text-gray-400 cursor-not-allowed">
                    Coming Soon
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="card p-5 bg-sky-50/60 border-sky-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">How integrations work with your AI</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { step: '1', title: 'Connect your account', desc: 'Authorize Envosta to read your calendar. Tokens are encrypted and stored securely in Vault.' },
                { step: '2', title: 'AI reads availability', desc: 'When a call comes in, the AI checks your real-time availability before answering.' },
                { step: '3', title: 'Books directly', desc: 'The AI can book appointments right into your calendar during the call — no manual follow-up.' },
              ].map(item => (
                <div key={item.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">{item.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
