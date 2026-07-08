# Runbook — Provisioning (signup → live)

**Who runs this:** ops/VA. No engineering knowledge required.
**When:** a new **signup job** appears (admin → Tickets → type `signup`,
created automatically the moment a client's payment clears). The email
notification links straight to it.
**Goal:** client live, confirmed, and never having lifted a finger.
**SLA context:** acknowledge the client in **under 4 hours** (a "we're on
it" text/call counts). Site-down for any live client always jumps the queue.

The automated steps run in dry-run until engineering flips
`PROVISIONING_DRY_RUN=false` (never flip it yourself). Anything marked
**MANUAL** is yours regardless.

## The job record

The signup ticket's metadata carries everything: business, contact
(name/email/phone), plan, billing period, industry, city, domain
preference, rep. If any field is missing, call the rep who closed it —
do not guess.

## Steps

1. **Acknowledge (MANUAL, <4h)** — text or call the client: welcome, what
   happens next, one number to reach us. Log it on the ticket.
2. **Domain (automated · verify)** —
   - *Register new:* OpenSRS registers it **in the client's name**
     (registrant = client's legal details; Envosta holds admin/tech + DNS
     control). Verify the order completed and the registrant is the client,
     not Envosta.
   - *Client has one:* initiate transfer-in OR (faster) point nameservers
     to wp.cloud at their current registrar with the client on the phone.
   - *Not sure:* agree the domain with the client during step 1.
3. **DNS → wp.cloud (automated · verify)** — nameservers point at wp.cloud;
   branded email records (SPF/DKIM/DMARC) present.
4. **Site container (automated · verify)** — wp.cloud site created, domain
   mapped, SSL issued. Verify https loads.
5. **Studio build (MANUAL)** — build the industry site in WP Studio from the
   industry template, push live with the migration plugin. Checklist:
   click-to-call on every page, quote-request form on every page, service
   pages match what the client actually sells, owner reviewed it.
6. **GBP setup (MANUAL)** — create/claim the Google Business Profile,
   categories + service areas set, phone = tracked number (Growth), photos
   up. Confirm the client granted us manager access — the Growth guarantee
   requires it.
7. **Forms + anti-spam (MANUAL)** — Turnstile keys on every form; send a
   test lead and confirm it arrives.
8. **Monitoring (MANUAL)** — add the site to the uptime monitor
   (UptimeRobot/BetterStack). Alert target: ops.
9. **Go-live confirmation (MANUAL)** — mark the ticket resolved, then call
   or text the client: you're live, here's your one number, first monthly
   report lands on the 1st. **The loop always closes with a confirmation.**

Growth clients additionally: record the **baseline call volume** (prior 6
months, client-attested) on the ticket — it powers the Booked-Calls
Make-Good — and install call tracking.

## Domain transfer-out (cancellations)

Client owns, Envosta operates — we never hold domains hostage:

1. Confirm the cancellation in writing on a ticket.
2. Disable the domain's auto-renew (admin → domain → auto-renew off).
3. Unlock the domain (registrar lock off) in the admin domain panel.
4. Send the client the EPP/auth code **directly from the admin panel to the
   owner's email** — never through chat or third parties.
5. They initiate the transfer at their new registrar; approve promptly.
6. Downgrade offer first (Minimum keeps hosting + domain alive) — but if
   they're going, they go cleanly. Site/content license terms per contract.

## When something fails

- Automated step failed → the job shows the error; re-run once. Still
  failing → escalate to engineering with the ticket link. Never improvise
  registrar or DNS changes.
- Client unreachable for step 1 → retry morning + afternoon, then email,
  keep the ticket open. The 4-hour clock is about OUR first attempt.
