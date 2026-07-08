# Runbook — Monthly Engine (pages + reports + QA)

**Who runs this:** the VA QA pass — the ONLY recurring human labor below
Growth (charter §4.7).
**When:** the engine runs automatically on the **1st of each month, 08:00
UTC** and creates this month's deliverables per active client. Your work is
the QA loop through the month.
**Iron rule:** **nothing ships without QA sign-off.** Not a page, not a
report.

## What the engine creates (per active client)

| Plan | Service-area pages | Monthly report |
|---|---|---|
| Basic | 0 | yes |
| Business | 2 | yes |
| Growth | 4 | yes |

(The cadence comes from `src/config/pricing.ts` — if plans ever change
there, this table is what changes, not the process.)

Deliverables appear with status `planned`, pages due by the **21st**, the
report by **month-end**.

## The QA loop (statuses)

`planned → draft → qa → approved → published`

1. **Draft** — the page/report content gets produced (AI pipeline +
   operator). Move to `draft` when content exists.
2. **QA (you)** — check every item on the list below, then `approved` or
   send back to `draft` with a note. You are the last line before a client
   sees it.
3. **Publish** — approved pages go live on the client's site; approved
   reports get sent under Envosta branding. Stamp the published URL.

## QA checklist — service-area pages

- Reads like a competent local business wrote it — plain trade-owner
  language, no agency jargon, no filler.
- Facts are TRUE: services listed are ones this client offers; the city and
  neighbourhoods are theirs; phone number is theirs (tracked number for
  Growth).
- No forbidden claims anywhere: no guaranteed rankings, no "#1 on Google",
  no lead-count or income promises.
- Click-to-call + quote form present and working.
- Names, prices, and hours match the client's current reality.

## QA checklist — monthly report

- Every template field filled: uptime, incidents, pages shipped (with live
  links), GBP views/calls, reviews (new count, rating, responses).
- Numbers come from our systems — never screenshots of third-party
  dashboards (banned, charter §4).
- The one-paragraph client summary is honest: SEO compounds over months
  (typical ROI-positive window 7–9 months) — never promise next month's
  rankings.
- Branded, client's name right, sent to the right contact.

## If a month is missed or double-created

The engine is idempotent — re-running it never duplicates tasks. If the 1st
passed with nothing created, tell engineering to hit
`/api/cron/monthly-engine` (admin → Settings → Crons → Run now). If a
client shows no tasks, check they're marked `active`.
