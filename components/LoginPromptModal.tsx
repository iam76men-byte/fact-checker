'use client';

interface LoginPromptModalProps {
    isOpen: boolean;
    actionName: string; // 예: "추천/비추천 투표", "새 검증 의뢰 작성", "반론 등록"
    onClose: () => void;
    onLogin: () => void;
}

export default function LoginPromptModal({
    isOpen,
    actionName,
    onClose,
    onLogin,
}: LoginPromptModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
                {/* 상단 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-bold p-1 cursor-pointer transition"
                    aria-label="닫기"
                >
                    ✕
                </button>

                {/* 아이콘 및 타이틀 */}
                <div className="text-center space-y-2 pt-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#03c75a]/10 border border-[#03c75a]/30 mb-1">
                        <span className="text-[#03c75a] font-black text-xl tracking-tighter">N</span>
                    </div>
                    <h3 className="text-base font-bold text-white">
                        네이버 아이디 로그인 필요
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed px-1">
                        <span className="font-semibold text-neutral-100">[{actionName}]</span> 기능은 어뷰징 방지와 신뢰성 유지를 위해 <strong className="text-emerald-400">네이버 ID</strong>가 필요합니다.
                    </p>
                </div>

                {/* 개인정보 보호 안내 뱃지 */}
                <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-xl p-3 text-[11px] text-neutral-400 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-neutral-300">
                        <span>🔒</span>
                        <span>개인정보 최소화 원칙</span>
                    </div>
                    <p className="leading-normal">
                        이름, 이메일, 전화번호 등 일체의 개인정보는 수집하지 않으며, 오직 <strong>네이버의 고유 회원 식별값(ID)</strong>만 연동됩니다.
                    </p>
                </div>

                {/* 버튼 액션 */}
                <div className="space-y-2 pt-1">
                    <button
                        type="button"
                        onClick={onLogin}
                        className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-[#03c75a] hover:bg-[#02b350] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition shadow-md cursor-pointer"
                    >
                        <span className="font-black text-base leading-none">N</span>
                        <span>네이버 아이디로 로그인</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium text-xs rounded-xl transition cursor-pointer"
                    >
                        취소하고 둘러보기 (로그인 없이 열람)
                    </button>
                </div>
            </div>
        </div>
    );
}
