import { NextRequest, NextResponse } from 'next/server';
import { NAVER_SESSION_COOKIE } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/';

    // 테스트용 고유 네이버 ID 생성 (랜덤 난수 형태)
    const randomHex = Math.random().toString(36).substring(2, 10);
    const mockNaverId = `nid_${randomHex}`;

    const response = NextResponse.redirect(new URL(returnTo, request.url));

    response.cookies.set(NAVER_SESSION_COOKIE, mockNaverId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30일
        sameSite: 'lax',
    });

    return response;
}
