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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-800/60 p-4 rounded-xl border border-neutral-700/60">
                <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>📢</span> 시민 팩트체크 의뢰
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">시민들의 추천 비율이 높은 안건을 우선 검증하여 리포트로 발행합니다.</p>
                </div>
                <button
                    onClick={onOpenModal}
                    className="self-start sm:self-auto shrink-0 whitespace-nowrap px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-1 cursor-pointer"
                >
                    <span>+</span>
                    <span>새 의뢰 작성</span>
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
                                className="bg-neutral-800 border border-neutral-700/80 hover:border-neutral-600 transition rounded-xl p-4 md:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 md:gap-4 shadow-sm"
                            >
                                {/* 좌측/상단: 순위 + 스코어 + 제목 + 메타링크 */}
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    {/* 순위 & 스코어 */}
                                    <div className="flex sm:flex-col items-center gap-1.5 sm:gap-1 shrink-0 pt-0.5">
                                        <span className="w-6 text-center font-bold text-base md:text-lg text-white">
                                            {index + 1}
                                        </span>
                                        <span
                                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${netScore > 0
                                                ? 'text-red-400 bg-red-950/40 border-red-900/60'
                                                : netScore < 0
                                                    ? 'text-blue-400 bg-blue-950/40 border-blue-900/60'
                                                    : 'text-neutral-400 bg-neutral-900 border-neutral-700'
                                                }`}
                                        >
                                            {netScore > 0 ? `+${netScore}` : netScore}
                                        </span>
                                    </div>

                                    {/* 본문 제목 및 메타정보: 모바일 폭 100% 활용 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm md:text-[14.5px] font-medium text-neutral-100 leading-snug break-keep sm:break-normal mb-2">
                                            {req.title}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-neutral-400">
                                            <span className="text-[11px] text-neutral-400 shrink-0">
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
                                                    title="기사 화면 캡처본(증거 박제) 새창 확인"
                                                    className="inline-flex items-center gap-1.5 bg-neutral-700/80 hover:bg-neutral-600 text-neutral-200 hover:text-white px-2.5 py-0.5 rounded text-[11px] font-medium border border-neutral-600/70 transition shrink-0 shadow-sm"
                                                >
                                                    <span>📸</span>
                                                    <span>원문 캡처 박제</span>
                                                </a>
                                            )}

                                            {req.source_url && (
                                                <a
                                                    href={req.source_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-neutral-400 hover:text-neutral-200 underline text-[11px] shrink-0"
                                                >
                                                    기사 원문 ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 투표 버튼: 모바일에서는 하단 균형 정렬, 데스크톱에서는 우측 정렬 */}
                                <div className="flex items-center justify-end gap-2 shrink-0 border-t border-neutral-700/50 sm:border-0 pt-2.5 sm:pt-0">
                                    <button
                                        type="button"
                                        onClick={() => onVote(req.id, 'up')}
                                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition cursor-pointer active:scale-95 ${myVote === 'up'
                                            ? 'bg-red-950/80 border-red-500 text-red-300 ring-1 ring-red-500 font-semibold'
                                            : 'bg-neutral-900/90 hover:bg-red-950/40 border-neutral-700 hover:border-red-600/70 text-neutral-300'
                                            }`}
                                    >
                                        <span className="text-xs">찬성</span>
                                        <span className={`text-xs font-bold ${myVote === 'up' ? 'text-red-400' : 'text-neutral-300'}`}>
                                            {up}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onVote(req.id, 'down')}
                                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition cursor-pointer active:scale-95 ${myVote === 'down'
                                            ? 'bg-blue-950/80 border-blue-500 text-blue-300 ring-1 ring-blue-500 font-semibold'
                                            : 'bg-neutral-900/90 hover:bg-blue-950/40 border-neutral-700 hover:border-blue-600/70 text-neutral-300'
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