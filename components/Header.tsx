'use client';

import Link from 'next/link';

interface HeaderProps {
    nickname?: string;
    onResetIdentity?: () => void;
    activeTab?: string;
    onTabChange?: (tab: any) => void;
}

export default function Header({ nickname, onResetIdentity, activeTab }: HeaderProps) {
    return (
        <header className="mb-6 md:mb-8 border-b border-neutral-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <Link href="/" className="inline-block group">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white group-hover:text-neutral-200 transition">
                        FactRepo <span className="text-red-500 text-sm font-semibold tracking-normal">Live</span>
                    </h1>
                </Link>
                <p className="text-neutral-400 text-xs md:text-sm mt-1">
                    공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {/* 상단 네비게이션 링크 */}
                <nav className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg text-xs">
                    <Link
                        href="/"
                        className={`px-2.5 py-1 rounded-md transition font-medium ${
                            activeTab !== 'rebuttals' && activeTab !== 'about'
                                ? 'bg-neutral-800 text-white font-semibold'
                                : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                    >
                        팩트체크
                    </Link>
                    <Link
                        href="/rebuttals"
                        className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                            activeTab === 'rebuttals'
                                ? 'bg-red-950/80 text-red-300 border border-red-800/80 font-semibold'
                                : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                    >
                        <span>⚖️</span>
                        <span>반론 게시판</span>
                    </Link>
                    <Link
                        href="/about"
                        className="px-2.5 py-1 rounded-md transition font-medium text-neutral-400 hover:text-neutral-200"
                    >
                        About
                    </Link>
                </nav>

                {nickname && (
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 px-2.5 py-1 rounded-md text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="font-semibold text-neutral-200">{nickname}</span>
                        </div>
                        {onResetIdentity && (
                            <button
                                onClick={onResetIdentity}
                                title="새 익명 식별자로 재발급"
                                className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-2 py-1 rounded-md border border-neutral-700 transition cursor-pointer"
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