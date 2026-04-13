/**
 * Google Calendar API helpers.
 * Handles OAuth token exchange, refresh, free/busy queries, and event creation.
 */

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix ms timestamp
  token_type: string;
  scope: string;
}

export interface GoogleUserInfo {
  sub: string;   // Google user ID
  email: string;
  name?: string;
}

export interface TimeSlot {
  start: string; // ISO 8601
  end: string;
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: { email: string }[];
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';

/** Exchange authorization code for tokens */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error_description || data.error || 'Token exchange failed');
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    token_type: data.token_type || 'Bearer',
    scope: data.scope || '',
  };
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string): Promise<Partial<GoogleTokens>> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error_description || data.error || 'Token refresh failed');
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    token_type: data.token_type || 'Bearer',
  };
}

/** Get the authenticated Google user's info */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json();
}

/** Get busy time blocks for a calendar */
export async function getFreeBusy(
  accessToken: string,
  calendarId: string = 'primary',
  daysAhead: number = 7,
): Promise<TimeSlot[]> {
  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + daysAhead);

  const res = await fetch(`${CALENDAR_BASE}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    }),
  });

  if (!res.ok) throw new Error('Failed to fetch free/busy');
  const data = await res.json();
  return data.calendars?.[calendarId]?.busy ?? [];
}

/** Format busy slots into human-readable availability string for the AI */
export function formatAvailabilityForAI(
  busySlots: TimeSlot[],
  businessHoursStart: number = 9,
  businessHoursEnd: number = 17,
  daysAhead: number = 7,
): string {
  const days: Record<string, string[]> = {};
  const now = new Date();

  // Generate all business hour slots (every 30 mins) for the next N days
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    // Skip weekends
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateKey = date.toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const slots: string[] = [];

    for (let h = businessHoursStart; h < businessHoursEnd; h++) {
      for (const min of [0, 30]) {
        const slotStart = new Date(date);
        slotStart.setHours(h, min, 0, 0);
        if (slotStart < now) continue; // skip past slots

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        // Check if this slot overlaps any busy period
        const isBusy = busySlots.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isBusy) {
          slots.push(slotStart.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true }));
        }
      }
    }

    if (slots.length > 0) {
      days[dateKey] = slots;
    }
  }

  if (Object.keys(days).length === 0) {
    return 'No available appointment slots in the next week.';
  }

  const lines = Object.entries(days)
    .slice(0, 5) // limit to 5 days to keep prompt size down
    .map(([day, slots]) => `${day}: ${slots.join(', ')}`);

  return `Available appointment slots (next 7 days):\n${lines.join('\n')}`;
}

/** Create a calendar event */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent,
  calendarId: string = 'primary',
): Promise<{ id: string; htmlLink: string }> {
  const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create calendar event');
  }
  const data = await res.json();
  return { id: data.id, htmlLink: data.htmlLink };
}

/** List the user's calendars */
export async function listCalendars(accessToken: string): Promise<{ id: string; summary: string; primary?: boolean }[]> {
  const res = await fetch(`${CALENDAR_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to list calendars');
  const data = await res.json();
  return (data.items ?? []).map((c: any) => ({
    id: c.id,
    summary: c.summary,
    primary: c.primary ?? false,
  }));
}
