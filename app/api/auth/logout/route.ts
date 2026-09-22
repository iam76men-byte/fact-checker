import { NextRequest, NextResponse } from 'next/server';
import { NAVER_SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ ok: true, loggedIn: false });
    response.cookies.delete(NAVER_SESSION_COOKIE);
    return response;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/';

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.delete(NAVER_SESSION_COOKIE);
    return response;
}
