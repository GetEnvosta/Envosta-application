import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Cache control for authenticated pages
  if (response.headers.get('x-middleware-next')) {
    response.headers.set('X-DNS-Prefetch-Control', 'on');
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  // On envosta.com (marketing site), skip auth — add security headers only
  const isMarketingSite = host === 'envosta.com' || host === 'www.envosta.com';
  if (isMarketingSite) {
    return addSecurityHeaders(NextResponse.next());
  }

  // No-cache on dashboard/admin/api routes
  let supabaseResponse = NextResponse.next({ request });
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/api')) {
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
    if (profile?.role !== 'admin') {
      return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
  }

  // Redirect logged-in users away from auth pages (except reset-password)
  if (user && pathname.startsWith('/auth/') && pathname !== '/auth/reset-password') {
    return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  return addSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|assets|favicon.ico).*)',
  ],
};
