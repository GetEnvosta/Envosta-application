// ── Role System ─────────────────────────────────────────────
// Single source of truth for all role constants, access maps, and helpers.

export const STAFF_ROLES = ['admin', 'affiliate', 'staff'] as const;
export const ALL_ROLES = ['admin', 'affiliate', 'staff', 'customer', 'partner'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type UserRole = (typeof ALL_ROLES)[number];

/** Returns true if the role is a staff role (admin, affiliate, staff). */
export function isStaffRole(role?: string | null): boolean {
  return STAFF_ROLES.includes(role as StaffRole);
}

// ── Admin Sidebar Nav Access ────────────────────────────────
// Maps each staff role to the admin nav hrefs they can see.
// '*' is a wildcard meaning "all items" (admin only).

export const ADMIN_NAV_ACCESS: Record<string, string[]> = {
  admin: ['*'],
  affiliate: [
    '/admin',
    '/admin/customers',
    '/admin/tickets',
    '/admin/commissions',
    '/admin/promotions',
  ],
  staff: [
    '/admin',
    '/admin/customers',
    '/admin/services',
    '/admin/domains',
    '/admin/tickets',
    '/admin/studio',
  ],
};

/** Check if a role can see a given admin nav item. */
export function canAccessAdminNav(role: string, href: string): boolean {
  const allowed = ADMIN_NAV_ACCESS[role];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;
  return allowed.includes(href);
}

// ── Admin Page Route Access ─────────────────────────────────
// Used by middleware / layout to block direct URL access to pages
// the role shouldn't see. Maps pathname prefixes to allowed roles.

const ADMIN_ROUTE_ROLES: Record<string, StaffRole[]> = {
  '/admin/billing':       ['admin'],
  '/admin/credits':       ['admin'],
  '/admin/partners':      ['admin'],
  '/admin/products':      ['admin'],
  '/admin/subscriptions': ['admin'],
  '/admin/blog':          ['admin'],
  '/admin/emails':        ['admin'],
  '/admin/diagnostics':   ['admin'],
  '/admin/logs':          ['admin'],
  '/admin/plans':         ['admin'],
  '/admin/commissions':   ['admin', 'affiliate'],
  '/admin/promotions':    ['admin', 'affiliate'],
  '/admin/customers':     ['admin', 'affiliate', 'staff'],
  '/admin/tickets':       ['admin', 'affiliate', 'staff'],
  '/admin/studio':        ['admin', 'staff'],
  '/admin/services':      ['admin', 'staff'],
  '/admin/domains':       ['admin', 'staff'],
};

/**
 * Check if a role can access a given admin route pathname.
 * Falls back to true for the base /admin dashboard and any unmatched routes
 * (those are further protected by page-level checks).
 */
export function canAccessAdminRoute(role: string, pathname: string): boolean {
  if (role === 'admin') return true;

  // Check each prefix — find the most specific match
  for (const [prefix, roles] of Object.entries(ADMIN_ROUTE_ROLES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return roles.includes(role as StaffRole);
    }
  }

  // Base /admin dashboard is accessible to all staff
  if (pathname === '/admin') return true;

  // Default: deny for non-admin
  return false;
}

// ── API Route Access ────────────────────────────────────────
// Maps API route prefixes to allowed roles.

export const API_ROUTE_ROLES: Record<string, StaffRole[]> = {
  '/api/admin/sync-stripe':                ['admin'],
  '/api/admin/sync-customer':              ['admin'],
  '/api/admin/sync-check':                 ['admin'],
  '/api/admin/create-product':             ['admin'],
  '/api/admin/refund-invoice':             ['admin'],
  '/api/admin/seed-blog':                  ['admin'],
  '/api/admin/test-email':                 ['admin'],
  '/api/admin/create-user':                ['admin'],
  '/api/admin/provision-site':             ['admin', 'staff'],
  '/api/admin/delete-site':                ['admin', 'staff'],
  '/api/admin/attach-domain-subscription': ['admin', 'staff'],
  '/api/admin/credits/adjust':              ['admin'],
  '/api/admin/credits/pricing':             ['admin'],
  '/api/admin/partners/review':             ['admin'],
  '/api/admin/partners/change-requests':    ['admin'],
  '/api/admin/create-unclaimed-account':    ['admin', 'staff'],
  '/api/admin/coupons':                    ['admin', 'affiliate'],
  '/api/admin/commissions':                ['admin', 'affiliate'],
  '/api/admin/delete-ticket':              ['admin', 'affiliate', 'staff'],
};

/** Check if a role can access a given admin API route. */
export function canAccessAdminApi(role: string, pathname: string): boolean {
  if (role === 'admin') return true;
  const allowed = API_ROUTE_ROLES[pathname];
  if (!allowed) return false;
  return allowed.includes(role as StaffRole);
}

// ── Role Badge Colors ───────────────────────────────────────

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin:     'bg-indigo-100 text-indigo-700',
  affiliate: 'bg-amber-100 text-amber-700',
  staff:     'bg-emerald-100 text-emerald-700',
  customer:  'bg-gray-100 text-gray-600',
  partner:   'bg-sky-100 text-sky-700',
};
