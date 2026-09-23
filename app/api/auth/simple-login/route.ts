import { NextRequest, NextResponse } from 'next/server';
import { SIMPLE_SESSION_COOKIE, SIMPLE_DISPLAY_ID_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const rawNickname = body.nickname?.trim();
        const recaptchaToken = body.recaptchaToken;

        // 1. 닉네임 정제 및 유효성 검사
        let nickname = rawNickname;
        if (!nickname) {
            // 닉네임 미입력 시 친절한 기본 닉네임 자동 생성
            const randomNum = Math.floor(100 + Math.random() * 900);
            nickname = `시민검증자_${randomNum}호`;
        } else {
            // 1~20글자로 자르고 태그나 위험 문자 정제
            nickname = nickname.replace(/[<>'"]/g, '').slice(0, 20);
            if (nickname.length === 0) {
                nickname = `시민검증자_${Math.floor(100 + Math.random() * 900)}호`;
            }
        }

        // 2. Google reCAPTCHA v3 토큰 검증
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

        if (recaptchaSecret && recaptchaSecret.trim() !== '') {
            if (!recaptchaToken) {
                return NextResponse.json(
                    { ok: false, error: 'Google reCAPTCHA 인증 토큰이 제공되지 않았습니다.' },
                    { status: 400 }
                );
            }

            try {
                const verifyParams = new URLSearchParams({
                    secret: recaptchaSecret,
                    response: recaptchaToken,
                });

                const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: verifyParams.toString(),
                    cache: 'no-store',
                });

                const verifyData = await verifyRes.json();

                // reCAPTCHA v3 점수 검증 (일반적으로 0.5 이상이면 정상 인간 사용자)
                if (!verifyData.success || (typeof verifyData.score === 'number' && verifyData.score < 0.5)) {
                    console.warn('[reCAPTCHA v3 Failed]', verifyData);
                    return NextResponse.json(
                        {
                            ok: false,
                            error: '자동화된 접근(봇)으로 감지되어 로그인이 제한되었습니다. 잠시 후 다시 시도해주세요.',
                            score: verifyData.score,
                        },
                        { status: 403 }
                    );
                }

                console.log(`[reCAPTCHA v3 Success] Score: ${verifyData.score}, Action: ${verifyData.action}`);
            } catch (verifyErr: any) {
                console.error('[reCAPTCHA Verification Error]', verifyErr);
                return NextResponse.json(
                    { ok: false, error: 'Google reCAPTCHA 검증 서버와 통신 중 오류가 발생했습니다.' },
                    { status: 502 }
                );
            }
        } else {
            // RECAPTCHA_SECRET_KEY가 설정되지 않은 경우 (개발 및 키 발급 전 환경)
            console.info('[reCAPTCHA Dev Bypass] RECAPTCHA_SECRET_KEY가 설정되지 않아 개발 모드로 자동 인증 통과 처리됩니다.');
        }

        // 3. 고유 회원 식별 ID 생성
        const randomHex = Math.random().toString(36).substring(2, 10);
        const userId = `uid_${Date.now()}_${randomHex}`;

        const user = {
            id: userId,
            displayId: nickname,
            maskedId: nickname,
            provider: 'recaptcha' as const,
        };

        const response = NextResponse.json({
            ok: true,
            user,
        });

        // 4. 세션 쿠키 설정 (30일 유지)
        const cookieOptions = {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30일
            sameSite: 'lax' as const,
        };

        response.cookies.set(SIMPLE_SESSION_COOKIE, userId, cookieOptions);
        response.cookies.set(SIMPLE_DISPLAY_ID_COOKIE, nickname, cookieOptions);

        return response;
    } catch (err: any) {
        console.error('Simple Login Error:', err);
        return NextResponse.json(
            { ok: false, error: '로그인 처리 중 예기치 못한 오류가 발생했습니다: ' + (err.message || '') },
            { status: 500 }
        );
    }
}
