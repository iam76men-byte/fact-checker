import { cookies } from 'next/headers';

export const NAVER_SESSION_COOKIE = 'factrepo_naver_uid';
export const NAVER_DISPLAY_ID_COOKIE = 'factrepo_naver_display_id';
export const NAVER_STATE_COOKIE = 'factrepo_oauth_state';
export const NAVER_RETURN_COOKIE = 'factrepo_auth_return';

export interface NaverUserSession {
    id: string; // 내부 고유 식별 ID
    displayId: string; // 화면 표시용 네이버 ID (예: iam76men)
    maskedId: string; // 표시용 (사용자가 원하는 실제 아이디 형식)
}

/**
 * 네이버 인가 URL 생성
 */
export function getNaverAuthorizeUrl(state: string, redirectUri: string): string {
    const clientId = process.env.NAVER_CLIENT_ID || '';
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state,
    });

    return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

/**
 * 네이버 접근 토큰(Access Token) 발급 요청
 */
export async function exchangeNaverToken(code: string, state: string, redirectUri?: string) {
    const clientId = process.env.NAVER_CLIENT_ID || '';
    const clientSecret = process.env.NAVER_CLIENT_SECRET || '';

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state,
    });

    if (redirectUri) {
        params.append('redirect_uri', redirectUri);
    }

    const res = await fetch(`https://nid.naver.com/oauth2.0/token?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`Naver token exchange failed with status ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
        throw new Error(`Naver token error: ${data.error_description || data.error}`);
    }

    return data.access_token as string;
}

/**
 * 네이버 프로필 조회:
 * 네이버 정책상 실제 아이디(iam76men)는 이메일(iam76men@naver.com)의 @ 앞자리로 전달됩니다.
 * 이메일이 제공되면 @ 앞부분을 displayId로 사용하고, 없으면 별명(nickname), 둘 다 없으면 고유 ID 사용.
 */
export async function getNaverProfile(accessToken: string): Promise<{ id: string; displayId: string }> {
    const res = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`Naver profile fetch failed with status ${res.status}`);
    }

    const data = await res.json();
    if (data.resultcode !== '00' || !data.response?.id) {
        throw new Error(`Invalid Naver profile response: ${data.message || 'ID not found'}`);
    }

    const uniqueId = String(data.response.id);
    let displayId = '';

    if (data.response.email) {
        // 예: iam76men@naver.com -> iam76men
        displayId = data.response.email.split('@')[0];
    } else if (data.response.nickname) {
        displayId = String(data.response.nickname);
    } else {
        // 이메일이나 별명이 제공되지 않았을 때의 fallback
        displayId = uniqueId.length > 8 ? uniqueId.slice(0, 8) : uniqueId;
    }

    return {
        id: uniqueId,
        displayId,
    };
}

/**
 * 서버 사이드에서 현재 세션의 네이버 유저 정보 확인
 */
export async function getServerNaverUser(): Promise<NaverUserSession | null> {
    const cookieStore = await cookies();
    const userId = cookieStore.get(NAVER_SESSION_COOKIE)?.value;
    const displayId = cookieStore.get(NAVER_DISPLAY_ID_COOKIE)?.value || userId || '';

    if (!userId) return null;

    return {
        id: userId,
        displayId: displayId,
        maskedId: displayId, // 사용자가 원하는 형식 (예: iam76men)
    };
}
