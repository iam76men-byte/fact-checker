'use client';

export interface RequestItem {
    id: number;
    title: string;
    source_url?: string;
    image_url?: string;
    upvotes: number;
    downvotes: number;
    created_at: string;
}

interface RequestListProps {
    requests: RequestItem[];
    loading: boolean;
    citizenId?: string; // 소문자 string으로 수정
    userVotes?: Record<number, 'up' | 'down'>; // ? 추가 (필수 해제)
    onVote?: (id: number, type: 'up' | 'down') => void; // ? 추가 (필수 해제)
    onOpenModal: () => void;
    onVoteUpdate?: (reqId: any, up: any, down: any) => void;
}

export default function RequestList({
    requests,
    loading,
    citizenId,
    userVotes = {}, // 기본 빈 객체 할당
    onVote = () => { }, // 기본 빈 함수 할당
    onOpenModal,
    onVoteUpdate,
}: RequestListProps) {

    const sortedRequests = [...requests].sort((a, b) => {
        const scoreA = (a.upvotes ?? 0) - (a.downvotes ?? 0);
        const scoreB = (b.upvotes ?? 0) - (b.downvotes ?? 0);
        return scoreB - scoreA;
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-neutral-800/60 p-4 rounded-lg border border-neutral-700/60">
                <div>
                    <h3 className="text-sm font-semibold text-white">시민 팩트체크 의뢰</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">찬성 비율이 높은 왜곡 의혹을 매일 우선 검증합니다.</p>
                </div>
                <button
                    onClick={onOpenModal}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded transition"
                >
                    + 새 의뢰 작성
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-neutral-400 text-sm">
                    데이터를 불러오는 중입니다...
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-neutral-800/40 rounded-lg border border-neutral-800 text-neutral-400 text-sm">
                    아직 등록된 의뢰가 없습니다. 첫 의뢰를 등록해 보세요!
                </div>
            ) : (
                <div className="space-y-2.5">
                    {sortedRequests.map((req, index) => {
                        const up = req.upvotes ?? 0;
                        const down = req.downvotes ?? 0;
                        const netScore = up - down;
                        const myVote = userVotes[req.id];

                        return (
                            <div
                                key={req.id}
                                className="bg-neutral-800 border border-neutral-700/80 rounded-lg p-4 flex gap-4 items-center justify-between"
                            >
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="w-6 text-center font-bold text-lg text-white">
                                        {index + 1}
                                    </span>
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${netScore > 0
                                            ? 'text-red-400 bg-red-950/40 border-red-900/60'
                                            : netScore < 0
                                                ? 'text-blue-400 bg-blue-950/40 border-blue-900/60'
                                                : 'text-neutral-400 bg-neutral-900 border-neutral-700'
                                            }`}
                                    >
                                        {netScore > 0 ? `+${netScore}` : netScore}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-sm font-medium text-neutral-100 leading-snug mb-1.5">
                                        {req.title}
                                    </p>

                                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                                        <span>
                                            {new Date(req.created_at).toLocaleDateString('ko-KR', {
                                                month: 'numeric',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>

                                        {req.image_url && (
                                            <a
                                                href={req.image_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-neutral-700/70 hover:bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded text-[11px] transition"
                                            >
                                                📎 캡처 확인
                                            </a>
                                        )}

                                        {req.source_url && (
                                            <a
                                                href={req.source_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-neutral-400 hover:text-neutral-200 underline text-[11px]"
                                            >
                                                기사 원문
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => onVote(req.id, 'up')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition ${myVote === 'up'
                                            ? 'bg-red-950/80 border-red-500 text-red-300 ring-1 ring-red-500'
                                            : 'bg-neutral-900/90 hover:bg-red-950/40 border-neutral-700 hover:border-red-600/70 text-neutral-400'
                                            }`}
                                    >
                                        <span className="text-xs">찬성</span>
                                        <span className={`text-xs font-bold ${myVote === 'up' ? 'text-red-400' : 'text-neutral-300'}`}>
                                            {up}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => onVote(req.id, 'down')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition ${myVote === 'down'
                                            ? 'bg-blue-950/80 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                                            : 'bg-neutral-900/90 hover:bg-blue-950/40 border-neutral-700 hover:border-blue-600/70 text-neutral-400'
                                            }`}
                                    >
                                        <span className="text-xs">반대</span>
                                        <span className={`text-xs font-bold ${myVote === 'down' ? 'text-blue-400' : 'text-neutral-300'}`}>
                                            {down}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}