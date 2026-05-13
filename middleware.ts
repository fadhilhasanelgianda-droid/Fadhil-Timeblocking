import { NextRequest, NextResponse } from 'next/server';

/**
 * Protects all /api/* routes with a shared secret header.
 * The frontend sends the secret via x-api-secret on every request.
 * Set NEXT_PUBLIC_API_SECRET in .env (and Netlify environment variables).
 */
export function middleware(req: NextRequest) {
  const secret = process.env.NEXT_PUBLIC_API_SECRET;

  // If no secret is configured (e.g. local dev without env), allow all traffic
  if (!secret) return NextResponse.next();

  const incoming = req.headers.get('x-api-secret');
  if (incoming !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
