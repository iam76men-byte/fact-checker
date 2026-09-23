import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, DISPLAY_ID_COOKIE } from '@/lib/auth';

function clearAllAuthCookies(response: NextResponse) {
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(DISPLAY_ID_COOKIE);
    // 기존 레거시 쿠키 정리
    response.cookies.delete('factrepo_simple_uid');
    response.cookies.delete('factrepo_simple_display_id');
    response.cookies.delete('factrepo_naver_uid');
    response.cookies.delete('factrepo_naver_display_id');
    response.cookies.delete('factrepo_oauth_state');
    response.cookies.delete('factrepo_auth_return');
}

export async function POST(_request: NextRequest) {
    const response = NextResponse.json({ ok: true, loggedIn: false });
    clearAllAuthCookies(response);
    return response;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/';

    const response = NextResponse.redirect(new URL(returnTo, request.url));
    clearAllAuthCookies(response);
    return response;
}
