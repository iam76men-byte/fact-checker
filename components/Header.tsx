'use client';

interface HeaderProps {
    nickname: string;
    onResetIdentity: () => void;
}

export default function Header({ nickname, onResetIdentity }: HeaderProps) {
    return (
        <header className="mb-8 border-b border-neutral-700 pb-4 flex justify-between items-end">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                    FactRepo <span className="text-red-500 text-sm font-normal">Live</span>
                </h1>
                <p className="text-neutral-400 text-sm mt-1">
                    공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브
                </p>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-semibold text-neutral-200">{nickname}</span>
                </div>
                <button
                    onClick={onResetIdentity}
                    title="새 익명 식별자로 재발급"
                    className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white px-2 py-1.5 rounded border border-neutral-700 transition"
                >
                    재발급
                </button>
            </div>
        </header>
    );
}