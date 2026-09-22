import { cookies } from 'next/headers';

export const NAVER_SESSION_COOKIE = 'factrepo_naver_uid';
export const NAVER_STATE_COOKIE = 'factrepo_oauth_state';
export const NAVER_RETURN_COOKIE = 'factrepo_auth_return';

export interface NaverUserSession {
    id: string; // 네이버 고유 회원 식별 ID (오직 이 값만 수집/사용)
    maskedId: string;
}

/**
 * 네이버 ID 마스킹 헬퍼
 * 예: "a1b2c3d4e5" -> "a1b2***"
 */
export function maskUserId(id: string): string {
    if (!id) return '';
    if (id.length <= 4) return id + '***';
    return `${id.slice(0, 4)}***`;
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
 * 네이버 회원 프로필에서 '고유 ID'만 추출
 * (개인정보 최소화 원칙: 이름, 이메일, 전화번호 등 불필요한 정보는 일체 취급하지 않음)
 */
export async function getNaverUserId(accessToken: string): Promise<string> {
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

    // 오직 고유 회원 식별 번호만 반환
    return String(data.response.id);
}

/**
 * 서버 사이드에서 현재 세션의 네이버 유저 정보 확인
 */
export async function getServerNaverUser(): Promise<NaverUserSession | null> {
    const cookieStore = await cookies();
    const userId = cookieStore.get(NAVER_SESSION_COOKIE)?.value;

    if (!userId) return null;

    return {
        id: userId,
        maskedId: maskUserId(userId),
    };
}
