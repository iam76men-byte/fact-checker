import { NextRequest, NextResponse } from 'next/server';
import {
    exchangeNaverToken,
    getNaverUserId,
    NAVER_SESSION_COOKIE,
    NAVER_STATE_COOKIE,
    NAVER_RETURN_COOKIE,
} from '@/lib/auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const cookieState = request.cookies.get(NAVER_STATE_COOKIE)?.value;
    const returnTo = request.cookies.get(NAVER_RETURN_COOKIE)?.value || '/';

    // 사용자가 네이버 로그인창에서 취소했거나 에러가 발생한 경우
    if (error) {
        console.error('Naver login callback error:', error, errorDescription);
        const url = new URL(returnTo, request.url);
        url.searchParams.set('auth_error', encodeURIComponent(errorDescription || error));
        return NextResponse.redirect(url);
    }

    // CSRF 검증
    if (!code || !state || !cookieState || state !== cookieState) {
        console.error('Invalid state or code parameter', { state, cookieState, hasCode: !!code });
        const url = new URL(returnTo, request.url);
        url.searchParams.set('auth_error', 'invalid_state');
        return NextResponse.redirect(url);
    }

    try {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
        const proto = request.headers.get('x-forwarded-proto') || 'http';
        const redirectUri = `${proto}://${host}/api/auth/naver/callback`;

        // 1. 토큰 교환
        const accessToken = await exchangeNaverToken(code, state, redirectUri);

        // 2. 네이버 사용자 프로필에서 '오직 고유 ID'만 추출
        const naverId = await getNaverUserId(accessToken);

        // 3. 원래 돌아갈 URL 준비
        const targetUrl = new URL(returnTo, request.url);
        targetUrl.searchParams.set('login_success', '1');

        const response = NextResponse.redirect(targetUrl);

        // 4. 세션 쿠키 설정 (30일 유지)
        response.cookies.set(NAVER_SESSION_COOKIE, naverId, {
            httpOnly: false, // 클라이언트에서도 식별자 동기화 확인 가능하도록 (보안 필요 시 API 통해 검증 병행)
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30일
            sameSite: 'lax',
        });

        // 5. 사용 완료된 임시 쿠키 정리
        response.cookies.delete(NAVER_STATE_COOKIE);
        response.cookies.delete(NAVER_RETURN_COOKIE);

        return response;
    } catch (err: any) {
        console.error('Naver OAuth process error:', err);
        const url = new URL(returnTo, request.url);
        url.searchParams.set('auth_error', 'token_exchange_failed');
        return NextResponse.redirect(url);
    }
}
