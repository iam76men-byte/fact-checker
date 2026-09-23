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
            existingScript.addEventListener('load', () => resolve());
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
    });
}

/**
 * Google reCAPTCHA v3 토큰 획득 함수
 * 사이트 키가 없거나 스크립트 실행 불가 시 null 반환 (서버에서 개발 바이패스)
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

            window.grecaptcha.ready(async () => {
                try {
                    const token = await window.grecaptcha!.execute(siteKey, { action });
                    resolve(token);
                } catch (e) {
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
