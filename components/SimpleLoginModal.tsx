'use client';

import React, { useState, useEffect } from 'react';
import { executeRecaptcha } from '@/lib/recaptcha';

interface SimpleLoginModalProps {
    isOpen: boolean;
    actionName: string; // 예: "추천/비추천 투표", "새 검증 의뢰 작성", "반론 등록"
    onClose: () => void;
    onSuccess: (user: any) => void;
}

export default function SimpleLoginModal({
    isOpen,
    actionName,
    onClose,
    onSuccess,
}: SimpleLoginModalProps) {
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 모달이 열릴 때 기존 로컬스토리지 citizenId나 기본 추천 닉네임 설정
    useEffect(() => {
        if (isOpen) {
            setErrorMsg(null);
            try {
                const saved = localStorage.getItem('factrepo_citizen_id');
                if (saved) {
                    setNickname(saved);
                } else {
                    const randomNum = Math.floor(100 + Math.random() * 900);
                    setNickname(`시민검증자_${randomNum}호`);
                }
            } catch {
                setNickname('시민검증자');
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRandomNickname = () => {
        const randomNum = Math.floor(100 + Math.random() * 900);
        setNickname(`시민검증자_${randomNum}호`);
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        try {
            const finalNickname = nickname.trim() || `시민검증자_${Math.floor(100 + Math.random() * 900)}호`;

            // 1. Google reCAPTCHA v3 토큰 획득
            const token = await executeRecaptcha('simple_login');

            // 2. 서버 간편 로그인 API 호출
            const res = await fetch('/api/auth/simple-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nickname: finalNickname,
                    recaptchaToken: token,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                throw new Error(data.error || '로그인 인증에 실패했습니다.');
            }

            // 로컬스토리지에도 동기화
            try {
                localStorage.setItem('factrepo_citizen_id', finalNickname);
            } catch {}

            // 성공 콜백 호출
            onSuccess(data.user);
            onClose();
        } catch (err: any) {
            console.error('Simple login failed:', err);
            setErrorMsg(err.message || '인증 중 문제가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleNaverOAuth = () => {
        const dest = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
        window.location.href = `/api/auth/naver/login?returnTo=${encodeURIComponent(dest)}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-700/90 rounded-2xl p-6 shadow-2xl space-y-4">
                {/* 상단 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-bold p-1 cursor-pointer transition"
                    aria-label="닫기"
                    disabled={loading}
                >
                    ✕
                </button>

                {/* 상단 보안 뱃지 & 타이틀 */}
                <div className="text-center space-y-2 pt-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-1 text-cyan-400 text-2xl shadow-inner">
                        🛡️
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                        간편 시민 로그인
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed px-1">
                        <span className="font-semibold text-cyan-400">[{actionName}]</span> 기능은 신뢰성 확보 및 어뷰징 방지를 위해 본인 식별이 필요합니다.
                    </p>
                </div>

                {/* 닉네임 입력 및 폼 */}
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                            활동 닉네임 설정
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="활동 닉네임 입력 (최대 15자)"
                                maxLength={15}
                                required
                                disabled={loading}
                                className="flex-1 bg-neutral-950 border border-neutral-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden transition"
                            />
                            <button
                                type="button"
                                onClick={handleRandomNickname}
                                disabled={loading}
                                title="랜덤 닉네임 생성"
                                className="px-2.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium border border-neutral-700 transition cursor-pointer"
                            >
                                🎲 랜덤
                            </button>
                        </div>
                    </div>

                    {/* Google reCAPTCHA v3 보안 안내 */}
                    <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 text-[11px] text-neutral-400 space-y-1.5">
                        <div className="flex items-center justify-between text-neutral-300 font-medium">
                            <span className="flex items-center gap-1.5 text-cyan-400">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                </svg>
                                Google reCAPTCHA v3 봇 방지
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                                자동 보호
                            </span>
                        </div>
                        <p className="leading-relaxed text-neutral-400 text-[11px]">
                            별도의 비밀번호 없이 Google reCAPTCHA v3를 통해 매크로와 악성 봇을 자동 필터링하여 안전하게 시작합니다.
                        </p>
                    </div>

                    {/* 에러 메시지 */}
                    {errorMsg && (
                        <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-2.5 text-xs text-red-300 text-center animate-shake">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    {/* 로그인 제출 버튼 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                                <span>보안 인증 진행 중...</span>
                            </>
                        ) : (
                            <>
                                <span>🛡️</span>
                                <span>보안 인증 후 시작하기</span>
                            </>
                        )}
                    </button>
                </form>

                {/* 하단 보조 옵션 */}
                <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                    <button
                        type="button"
                        onClick={handleNaverOAuth}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs rounded-xl border border-neutral-800 transition cursor-pointer"
                    >
                        <span className="w-3.5 h-3.5 rounded-xs bg-[#03c75a] text-white text-[9px] font-black flex items-center justify-center shrink-0">
                            N
                        </span>
                        <span>네이버 아이디로 로그인하기 (옵션)</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-full py-2 px-3 text-neutral-500 hover:text-neutral-300 text-xs text-center transition cursor-pointer"
                    >
                        취소하고 둘러보기 (로그인 없이 열람)
                    </button>
                </div>
            </div>
        </div>
    );
}
