import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'factrepo_citizen_uid';
export const DISPLAY_ID_COOKIE = 'factrepo_citizen_name';

// 기존 쿠키 호환
export const SIMPLE_SESSION_COOKIE = SESSION_COOKIE;
export const SIMPLE_DISPLAY_ID_COOKIE = DISPLAY_ID_COOKIE;

export interface UserSession {
    id: string; // 고유 식별 ID
    displayId: string; // 화면 표시용 닉네임 (예: 시민검증자)
    maskedId: string;
}

/**
 * 서버 사이드에서 현재 세션의 유저 정보 확인
 */
export async function getServerUser(): Promise<UserSession | null> {
    const cookieStore = await cookies();

    const uid = cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get('factrepo_simple_uid')?.value;
    const displayId = cookieStore.get(DISPLAY_ID_COOKIE)?.value || cookieStore.get('factrepo_simple_display_id')?.value;

    if (uid && displayId) {
        return {
            id: uid,
            displayId: displayId,
            maskedId: displayId,
        };
    }

    return null;
}

