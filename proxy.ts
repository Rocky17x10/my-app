import { NextResponse, type NextRequest } from 'next/server';

/*
 * Optimistic route protection (Next 16 "proxy", formerly middleware). It only reads the
 * `session` hint cookie (= role, HttpOnly, set by the API on login/refresh, cleared on logout).
 * It is not a security boundary: the API checks every request, and a 401 there still sends the
 * browser to /login. Keep these lists in sync with components/shell/nav.ts.
 */

const ADMIN_ROUTES = [
  '/',
  '/dashboard',
  '/assets',
  '/users',
  '/asset-requests',
  '/returns',
  '/maintenance',
  '/tickets',
  '/reports',
  '/activity-logs',
];
const EMPLOYEE_ROUTES = ['/my-assets', '/my-requests', '/my-returns', '/support'];
/** Any signed-in role. */
const SHARED_ROUTES = ['/notifications', '/change-password'];

type Role = 'super_admin' | 'admin' | 'user';

function inList(pathname: string, routes: string[]): boolean {
  return routes.some((route) =>
    route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`),
  );
}

function readRole(request: NextRequest): Role | null {
  const value = request.cookies.get('session')?.value;
  return value === 'super_admin' || value === 'admin' || value === 'user' ? value : null;
}

function homeFor(role: Role): string {
  return role === 'user' ? '/my-assets' : '/dashboard';
}

function redirect(request: NextRequest, pathname: string, search = ''): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const role = readRole(request);

  if (pathname === '/login') {
    // apiFetch adds `expired` when the API rejected the session: drop the stale hint, show the form.
    if (searchParams.has('expired')) {
      const response = NextResponse.next();
      if (request.cookies.has('session')) response.cookies.delete('session');
      return response;
    }
    return role ? redirect(request, homeFor(role)) : NextResponse.next();
  }

  const admin = inList(pathname, ADMIN_ROUTES);
  const employee = inList(pathname, EMPLOYEE_ROUTES);
  if (!admin && !employee && !inList(pathname, SHARED_ROUTES)) return NextResponse.next(); // 404s etc.

  if (!role) {
    return redirect(request, '/login', `?next=${encodeURIComponent(pathname + search)}`);
  }
  if (admin && role === 'user') return redirect(request, '/my-assets');
  if (employee && role !== 'user') return redirect(request, '/dashboard');
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and files with an extension (favicon, images, fonts).
  matcher: ['/((?!_next/|.*\\.[\\w]+$).*)'],
};
