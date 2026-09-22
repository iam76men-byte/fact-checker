import { NextRequest, NextResponse } from 'next/server';
import { getNaverAuthorizeUrl, NAVER_STATE_COOKIE, NAVER_RETURN_COOKIE } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo') || '/';

    const clientId = process.env.NAVER_CLIENT_ID;
    if (!clientId) {
        // NAVER_CLIENT_ID 미설정 시 개발/테스트용 친절한 안내 화면 또는 mock-login 안내
        const mockUrl = new URL('/api/auth/mock-login', request.url);
        mockUrl.searchParams.set('returnTo', returnTo);

        return new NextResponse(
            `<!DOCTYPE html>
            <html lang="ko">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>네이버 로그인 설정 안내</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #171717; color: #ededed; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                .card { background: #262626; border: 1px solid #404040; border-radius: 12px; max-width: 520px; width: 100%; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                h1 { font-size: 18px; margin-top: 0; color: #03c75a; display: flex; align-items: center; gap: 8px; }
                p { font-size: 14px; line-height: 1.6; color: #a3a3a3; }
                code { background: #171717; padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 13px; }
                .btn { display: inline-block; background: #03c75a; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; font-size: 14px; margin-top: 12px; }
                .btn-secondary { background: #404040; margin-left: 8px; }
                .btn:hover { opacity: 0.9; }
                ol { padding-left: 20px; font-size: 13px; color: #d4d4d4; line-height: 1.8; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1><span>🟢</span> 네이버 Client ID 설정 필요</h1>
                <p>현재 <code>.env.local</code> 파일에 <code>NAVER_CLIENT_ID</code> 및 <code>NAVER_CLIENT_SECRET</code>가 아직 입력되지 않았습니다.</p>
                
                <ol>
                  <li><a href="https://developers.naver.com/apps" target="_blank" style="color: #38bdf8;">네이버 개발자센터</a>에서 애플리케이션 등록</li>
                  <li>서비스 URL: <code>http://localhost:3000</code> 등록</li>
                  <li>Callback URL: <code>http://localhost:3000/api/auth/naver/callback</code> 등록</li>
                  <li>발급된 Client ID / Secret을 <code>.env.local</code>에 기입</li>
                </ol>

                <p style="margin-top: 16px;"><strong>로컬 테스트용:</strong> 설정 전 바로 기능을 확인하시려면 아래 테스트 로그인을 이용하세요.</p>
                <div>
                  <a href="${mockUrl.toString()}" class="btn">테스트 네이버 ID로 즉시 로그인</a>
                  <a href="${returnTo}" class="btn btn-secondary">돌아가기</a>
                </div>
              </div>
            </body>
            </html>`,
            {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
        );
    }

    // CSRF 방지용 랜덤 state 생성
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // 호스트 기반 redirectUri 자동 계산
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${proto}://${host}/api/auth/naver/callback`;

    const authorizeUrl = getNaverAuthorizeUrl(state, redirectUri);

    const response = NextResponse.redirect(authorizeUrl);

    // State 쿠키 (10분 유효)
    response.cookies.set(NAVER_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 10,
        sameSite: 'lax',
    });

    // 리턴 대상 URL 쿠키
    response.cookies.set(NAVER_RETURN_COOKIE, returnTo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 10,
        sameSite: 'lax',
    });

    return response;
}
