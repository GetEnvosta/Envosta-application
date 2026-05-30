/**
 * Settings → Emails. Transactional email template previews + test sends.
 * Moved out of the Health page. Reuses the existing AdminEmailsPage component
 * (still also reachable at the legacy /admin/emails route).
 */
import AdminEmailsPage from '@/app/(app)/admin/emails/page';

export default function SettingsEmailsPage() {
  return <AdminEmailsPage />;
}
