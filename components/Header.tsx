'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface HeaderProps {
    nickname?: string;
    onResetIdentity?: () => void;
    activeTab?: 'facts' | 'requests' | 'rebuttals' | 'about';
    onTabChange?: (tab: 'facts' | 'requests' | 'about') => void;
    factsCount?: number;
    requestsCount?: number;
}

export default function Header({
    nickname,
    onResetIdentity,
    activeTab = 'facts',
    onTabChange,
    factsCount,
    requestsCount,
}: HeaderProps) {
    const pathname = usePathname();
    const isMainPage = pathname === '/';
    const { user, isLoggedIn, login, logout, loading } = useAuth();

    const handleFactsClick = (e: React.MouseEvent) => {
        if (isMainPage && onTabChange) {
            e.preventDefault();
            onTabChange('facts');
        }
    };

    const handleRequestsClick = (e: React.MouseEvent) => {
        if (isMainPage && onTabChange) {
            e.preventDefault();
            onTabChange('requests');
        }
    };

    const handleAboutClick = (e: React.MouseEvent) => {
        if (isMainPage && onTabChange) {
            e.preventDefault();
            onTabChange('about');
        }
    };

    return (
        <header className="mb-6 border-b border-neutral-800 pb-4 space-y-2.5">
            {/* 1행: 로고 & 네이버 로그인/회원 식별자 뱃지 */}
            <div className="flex items-center justify-between gap-4">
                <Link href="/" className="inline-block group">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black text-white tracking-tight group-hover:text-neutral-200 transition">
                            FactRepo
                        </h1>
                        <span className="text-[10px] uppercase tracking-wider bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                            ARCHIVE
                        </span>
                    </div>
                </Link>

                {/* 우측 사용자 인증 영역 */}
                <div className="flex items-center gap-2">
                    {loading ? (
                        <div className="text-[11px] text-neutral-500 py-1">인증 확인 중...</div>
                    ) : isLoggedIn && user ? (
                        <div className="flex items-center gap-1.5">
                            <div
                                className="flex items-center gap-1.5 bg-neutral-800/90 border border-neutral-700 px-2.5 py-1 rounded-lg text-xs shadow-sm"
                                title={`시민 닉네임: ${user.displayId || user.maskedId}`}
                            >
                                <span className="text-cyan-400 text-xs shrink-0">
                                    🛡️
                                </span>
                                <span className="text-neutral-200 font-medium">{user.displayId || user.maskedId}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => logout()}
                                title="로그아웃"
                                className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded-lg border border-neutral-700 transition cursor-pointer"
                            >
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => login()}
                            title="Google reCAPTCHA v3 보안 간편 로그인 (추천/비추천 및 글쓰기 지원)"
                            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                        >
                            <span className="text-xs">🛡️</span>
                            <span>간편 로그인</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2행: 공익 아카이브 슬로건 & 상단 통합 글로벌 네비게이션 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
                <p className="text-neutral-400 text-xs hidden sm:block">
                    공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브
                </p>

                {/* 글로벌 네비게이션 바 */}
                <nav className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl text-xs shadow-inner overflow-x-auto no-scrollbar self-start sm:self-auto">
                    {/* 1. 검증 팩트 리포트 */}
                    <Link
                        href="/?tab=facts"
                        onClick={handleFactsClick}
                        className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                            activeTab === 'facts'
                                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                        title="검증 팩트 리포트 보기"
                    >
                        <span>검증 팩트 리포트</span>
                        {typeof factsCount === 'number' && (
                            <span className="ml-1 text-[11px] opacity-70">({factsCount})</span>
                        )}
                    </Link>

                    {/* 2. 검증 의뢰소 */}
                    <Link
                        href="/?tab=requests"
                        onClick={handleRequestsClick}
                        className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                            activeTab === 'requests'
                                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                        title="시민 검증 의뢰소 보기"
                    >
                        <span>검증 의뢰소</span>
                        {typeof requestsCount === 'number' && (
                            <span className="ml-1 text-[11px] opacity-70">({requestsCount})</span>
                        )}
                    </Link>

                    {/* 3. 반론 게시판 */}
                    <Link
                        href="/rebuttals"
                        className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'rebuttals'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700/80 shadow-sm'
                                : 'text-amber-400/90 hover:text-amber-200 hover:bg-neutral-800/50'
                        }`}
                        title="시민 반론 게시판 보기"
                    >
                        <span>⚖️</span>
                        <span>반론 게시판</span>
                    </Link>

                    {/* 4. 소개 및 검증원칙 */}
                    <Link
                        href="/about"
                        onClick={handleAboutClick}
                        className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                            activeTab === 'about'
                                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                        title="서비스 소개 및 5단계 검증 방법론"
                    >
                        소개 및 원칙
                    </Link>
                </nav>
            </div>
        </header>
    );
}