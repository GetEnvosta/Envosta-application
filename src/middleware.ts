import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isStaffRole, canAccessAdminRoute } from '@/lib/roles';

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.google-analytics.com wss://*.supabase.co; frame-src https://js.stripe.com https://hooks.stripe.com;");
  return response;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  // Marketing site — skip all auth logic (let Vercel handle domain redirects)
  const isAppDomain = host.startsWith('my.') || host.startsWith('app.') || host.includes('localhost');
  if (!isAppDomain) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Everything below is for the app domain (my.envosta.com / localhost)
  let supabaseResponse = NextResponse.next({ request });

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/partner') || pathname.startsWith('/api')) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', pathname);
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  // Protect admin routes — block during impersonation
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)));
    }
    const impersonating = request.cookies.get('impersonating_user_id')?.value;
    if (impersonating) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single();
    if (!isStaffRole(profile?.role)) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    // Check if this staff role can access the specific admin route
    if (!canAccessAdminRoute(profile!.role, pathname)) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)));
    }
  }

  // Protect partner routes
  if (pathname.startsWith('/partner')) {
    if (!user) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/auth/login', request.url)));
    }
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'partner') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
  }

  // Redirect logged-in users away from auth pages (except reset-password and signout)
  if (user && pathname.startsWith('/auth/') && pathname !== '/auth/reset-password' && pathname !== '/auth/signout' && pathname !== '/auth/claim') {
    return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  return addSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|assets|favicon.ico).*)',
  ],
};
