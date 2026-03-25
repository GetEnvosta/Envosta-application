import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  // On envosta.com (marketing site), skip all auth logic — let Next.js serve marketing pages
  const isMarketingSite = host === 'envosta.com' || host === 'www.envosta.com';
  if (isMarketingSite) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

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
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Protect admin routes — block during impersonation
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    // Block admin access while impersonating a customer
    const impersonating = request.cookies.get('impersonating_user_id')?.value;
    if (impersonating) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    const { data: profile } = await supabase
      .from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Redirect logged-in users away from auth pages (except reset-password)
  if (user && request.nextUrl.pathname.startsWith('/auth/') && request.nextUrl.pathname !== '/auth/reset-password') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/auth/:path*',
    '/features/:path*',
    '/pricing/:path*',
    '/support/:path*',
    '/studio/:path*',
    '/blog/:path*',
    '/onboarding/:path*',
    '/method/:path*',
    '/careers/:path*',
    '/affiliate/:path*',
    '/legal/:path*',
  ],
};
