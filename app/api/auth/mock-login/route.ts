import { NextRequest, NextResponse } from 'next/server';
import { NAVER_SESSION_COOKIE, NAVER_DISPLAY_ID_COOKIE } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/';

    // 테스트용 고유 네이버 ID 및 표시용 네이버 ID
    const randomHex = Math.random().toString(36).substring(2, 10);
    const mockNaverId = `nid_${randomHex}`;
    const mockDisplayId = 'iam76men';

    const response = NextResponse.redirect(new URL(returnTo, request.url));

    response.cookies.set(NAVER_SESSION_COOKIE, mockNaverId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30일
        sameSite: 'lax',
    });

    response.cookies.set(NAVER_DISPLAY_ID_COOKIE, mockDisplayId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30일
        sameSite: 'lax',
    });

    return response;
}
