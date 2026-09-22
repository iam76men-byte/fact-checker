'use client';

import Link from 'next/link';

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
    return (
        <header className="mb-6 border-b border-neutral-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
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
                <p className="text-neutral-400 text-xs mt-1">
                    공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {/* 상단 글로벌 네비게이션 */}
                <nav className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl text-xs shadow-inner">
                    {/* 1. 검증 팩트 리포트 */}
                    {onTabChange ? (
                        <button
                            type="button"
                            onClick={() => onTabChange('facts')}
                            className={`px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                                activeTab === 'facts'
                                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                            }`}
                        >
                            검증 팩트 리포트 {typeof factsCount === 'number' ? `(${factsCount})` : ''}
                        </button>
                    ) : (
                        <Link
                            href="/?tab=facts"
                            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
                                activeTab === 'facts'
                                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                            }`}
                        >
                            검증 팩트 리포트
                        </Link>
                    )}

                    {/* 2. 검증 의뢰소 */}
                    {onTabChange ? (
                        <button
                            type="button"
                            onClick={() => onTabChange('requests')}
                            className={`px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                                activeTab === 'requests'
                                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                            }`}
                        >
                            검증 의뢰소 {typeof requestsCount === 'number' ? `(${requestsCount})` : ''}
                        </button>
                    ) : (
                        <Link
                            href="/?tab=requests"
                            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
                                activeTab === 'requests'
                                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                            }`}
                        >
                            검증 의뢰소
                        </Link>
                    )}

                    {/* 3. 반론 게시판 */}
                    <Link
                        href="/rebuttals"
                        className={`px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1.5 ${
                            activeTab === 'rebuttals'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700/80 shadow-sm'
                                : 'text-amber-400/90 hover:text-amber-200 hover:bg-neutral-800/50'
                        }`}
                    >
                        <span>⚖️</span>
                        <span>반론 게시판</span>
                    </Link>

                    {/* 4. 소개 및 검증원칙 */}
                    {onTabChange ? (
                        <button
                            type="button"
                            onClick={() => onTabChange('about')}
                            className={`px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
                                activeTab === 'about'
                                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                            }`}
                        >
                            소개 및 원칙
                        </button>
                    ) : (
                        <Link
                            href="/about"
                            className={`px-3 py-1.5 rounded-lg transition font-semibold ${
                                activeTab === 'about'
                                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                            }`}
                        >
                            소개 및 원칙
                        </Link>
                    )}
                </nav>

                {/* 시민 익명 식별자 뱃지 */}
                {nickname && (
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <span className="text-neutral-200 font-medium">{nickname}</span>
                        </div>
                        {onResetIdentity && (
                            <button
                                type="button"
                                onClick={onResetIdentity}
                                title="새 익명 식별자로 재발급"
                                className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 px-2.5 py-1.5 rounded-lg border border-neutral-700 transition cursor-pointer"
                            >
                                재발급
                            </button>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}