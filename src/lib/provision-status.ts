/**
 * Derive a human-readable provision status for a site row from its
 * status + metadata. Used by admin UI to render a clear badge per site.
 */
export type ProvisionStatus = {
  label: string;       // 'Active', 'Queued', 'Provisioning (2/5)', 'Stuck', 'Cancelled', etc.
  tone: 'green' | 'blue' | 'yellow' | 'red' | 'gray';
  detail?: string;     // optional secondary text, e.g. last-attempt timestamp
};

export function getProvisionStatus(site: {
  status: string | null;
  wp_cloud_site_id: string | null;
  metadata: any;
}): ProvisionStatus {
  const meta = (site.metadata as any) ?? {};
  const attempts = meta.provision_attempts ?? 0;
  const givingUp = meta.provision_giving_up === true;
  const MAX = 5;

  switch (site.status) {
    case 'active':
      return { label: 'Active', tone: 'green' };
    case 'paused':
      return { label: 'Paused', tone: 'yellow', detail: 'Subscription past due' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'red', detail: meta.recovery_deadline ? `Deletes ${new Date(meta.recovery_deadline).toLocaleDateString()}` : undefined };
    case 'deleted':
      return { label: 'Deleted', tone: 'gray' };
    case 'failed':
      return { label: 'Failed', tone: 'red', detail: meta.failure_reason };
    case 'provisioning': {
      if (givingUp) return { label: 'Stuck', tone: 'red', detail: `Gave up after ${attempts} attempts` };
      if (!site.wp_cloud_site_id && attempts === 0) return { label: 'Queued', tone: 'blue' };
      if (!site.wp_cloud_site_id) return { label: `Provisioning (${attempts}/${MAX})`, tone: 'blue' };
      return { label: 'Finalizing', tone: 'blue', detail: 'wp.cloud created — wiring up DNS' };
    }
    default:
      return { label: site.status ?? 'unknown', tone: 'gray' };
  }
}
