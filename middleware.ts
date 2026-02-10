import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware'i devre dışı bırak - sorun yaratıyor
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};