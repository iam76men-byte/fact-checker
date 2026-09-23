/**
 * Google reCAPTCHA v3 클라이언트 헬퍼 유틸리티
 */

declare global {
    interface Window {
        grecaptcha?: {
            ready: (cb: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

/**
 * reCAPTCHA v3 스크립트를 동적으로 로드 (필요시 호출)
 */
export function loadRecaptchaScript(siteKey: string): Promise<void> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') return resolve();
        if (window.grecaptcha) return resolve();

        const existingScript = document.getElementById('recaptcha-v3-script');
        if (existingScript) {
            // 이미 스크립트 태그가 있으면 grecaptcha 객체가 준비될 때까지 최대 3초 대기
            let count = 0;
            const checkInterval = setInterval(() => {
                count++;
                if (window.grecaptcha || count > 30) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            return;
        }

        const script = document.createElement('script');
        script.id = 'recaptcha-v3-script';
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
            console.warn('[reCAPTCHA] Failed to load Google reCAPTCHA v3 script.');
            resolve();
        };
        document.head.appendChild(script);

        // 네트워크 차단 시 대비 (최대 4초 타임아웃)
        setTimeout(() => resolve(), 4000);
    });
}

/**
 * Google reCAPTCHA v3 토큰 획득 함수
 * 사이트 키가 없거나 스크립트 실행 불가 시 null 반환 (서버에서 개발 바이패스 처리)
 */
export async function executeRecaptcha(action: string = 'login'): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    const siteKey = RECAPTCHA_SITE_KEY.trim();
    if (!siteKey) {
        // 사이트 키 미설정 시 null 반환 (서버는 개발 모드로 승인)
        return null;
    }

    try {
        if (!window.grecaptcha) {
            await loadRecaptchaScript(siteKey);
        }

        return await new Promise<string | null>((resolve) => {
            if (!window.grecaptcha) {
                return resolve(null);
            }

            // 애드블록/네트워크 지연으로 무한 대기하지 않도록 5초 타임아웃 적용
            const timeoutTimer = setTimeout(() => {
                console.warn('[reCAPTCHA] Execution timed out (adblock or network delay).');
                resolve(null);
            }, 5000);

            window.grecaptcha.ready(async () => {
                try {
                    const token = await window.grecaptcha!.execute(siteKey, { action });
                    clearTimeout(timeoutTimer);
                    resolve(token);
                } catch (e) {
                    clearTimeout(timeoutTimer);
                    console.warn('[reCAPTCHA execute error]', e);
                    resolve(null);
                }
            });
        });
    } catch (err) {
        console.warn('[reCAPTCHA error]', err);
        return null;
    }
}
