'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import RequestList, { RequestItem } from './RequestList';
import FactTabs, { FactItem } from './FactTabs';
import RequestModal from './RequestModal';
import AdminFactModal from './AdminFactModal';
import AboutSection from './AboutSection';

interface ClientHomeProps {
    initialFacts: FactItem[];
    initialRequests: RequestItem[];
}

export default function ClientHome({ initialFacts, initialRequests }: ClientHomeProps) {
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<'facts' | 'requests' | 'about'>('facts');
    const [citizenId, setCitizenId] = useState<string>('시민검증자');

    const [facts, setFacts] = useState<FactItem[]>(initialFacts);
    const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
    const [userVotes, setUserVotes] = useState<Record<number, 'up' | 'down'>>({});
    const isVotingRef = useRef<Record<number, boolean>>({});

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

    // 브라우저 마운트 완료 후에만 localStorage에 접근 (Hydration Mismatch 방지)
    useEffect(() => {
        setMounted(true);
        try {
            let stored = localStorage.getItem('factrepo_citizen_id');
            // 이전의 '진실탐정' 형태 닉네임이 저장되어 있다면 새 명칭 '시민검증자'로 정돈
            if (!stored || stored.includes('진실탐정')) {
                const randomNum = Math.floor(100 + Math.random() * 900);
                stored = `시민검증자_${randomNum}호`;
                localStorage.setItem('factrepo_citizen_id', stored);
            }
            setCitizenId(stored);

            const storedVotes = localStorage.getItem('factrepo_user_votes');
            if (storedVotes) {
                setUserVotes(JSON.parse(storedVotes));
            }
        } catch {
            setCitizenId(`시민검증자_${Math.floor(100 + Math.random() * 900)}호`);
        }
    }, []);

    const handleRenewCitizenId = () => {
        try {
            const randomNum = Math.floor(100 + Math.random() * 900);
            const newId = `시민검증자_${randomNum}호`;
            localStorage.setItem('factrepo_citizen_id', newId);
            setCitizenId(newId);
        } catch {
            setCitizenId(`시민검증자_${Math.floor(100 + Math.random() * 900)}호`);
        }
    };

    const handleVote = async (id: number, type: 'up' | 'down') => {
        if (isVotingRef.current[id]) return;
        isVotingRef.current[id] = true;

        try {
            const target = requests.find((r) => r.id === id);
            if (!target) return;

            const currentVote = userVotes[id];
            let newUpvotes = target.upvotes ?? 0;
            let newDownvotes = target.downvotes ?? 0;
            const newUserVotes = { ...userVotes };

            let deltaUp = 0;
            let deltaDown = 0;

            if (currentVote === type) {
                // 이미 투표한 것을 다시 눌렀을 때: 취소
                if (type === 'up') {
                    deltaUp = -1;
                } else {
                    deltaDown = -1;
                }
                delete newUserVotes[id];
            } else if (currentVote) {
                // 반대 투표로 변경할 때
                if (type === 'up') {
                    deltaUp = 1;
                    deltaDown = -1;
                } else {
                    deltaUp = -1;
                    deltaDown = 1;
                }
                newUserVotes[id] = type;
            } else {
                // 신규 투표
                if (type === 'up') {
                    deltaUp = 1;
                } else {
                    deltaDown = 1;
                }
                newUserVotes[id] = type;
            }

            const finalUp = Math.max(0, newUpvotes + deltaUp);
            const finalDown = Math.max(0, newDownvotes + deltaDown);

            // 로컬 UI 상태 즉시 낙관적 반영
            setUserVotes(newUserVotes);
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, upvotes: finalUp, downvotes: finalDown } : r
                )
            );

            try {
                localStorage.setItem('factrepo_user_votes', JSON.stringify(newUserVotes));
            } catch (e) {
                console.error('로컬스토리지 저장 실패:', e);
            }

            // Supabase RPC 호출로 안전한 DB 동기화
            const { error: rpcError } = await supabase.rpc('vote_request', {
                row_id: id,
                delta_up: deltaUp,
                delta_down: deltaDown,
            });

            if (rpcError) {
                // RPC 실패 시 fallback direct update
                const { error: updateError } = await supabase
                    .from('requests')
                    .update({
                        upvotes: finalUp,
                        downvotes: finalDown,
                    })
                    .eq('id', id);

                if (updateError) {
                    console.error('투표 업데이트 실패:', updateError);
                }
            } else {
                // 서버 최신 수치 재동기화
                const { data: updatedRow } = await supabase
                    .from('requests')
                    .select('upvotes, downvotes')
                    .eq('id', id)
                    .single();

                if (updatedRow) {
                    setRequests((prev) =>
                        prev.map((r) =>
                            r.id === id
                                ? { ...r, upvotes: updatedRow.upvotes, downvotes: updatedRow.downvotes }
                                : r
                        )
                    );
                }
            }
        } catch (err) {
            console.error('투표 처리 중 오류 발생:', err);
        } finally {
            isVotingRef.current[id] = false;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 상단 헤더 */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black text-white tracking-tight">FactRepo</h1>
                        <span className="text-[10px] uppercase tracking-wider bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                            Archive
                        </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                        공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        <span className="text-neutral-300 font-medium">
                            {mounted ? citizenId : '시민 확인 중...'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleRenewCitizenId}
                        className="text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 px-2.5 py-1.5 rounded-lg border border-neutral-700 transition cursor-pointer"
                        title="새 닉네임 발급"
                    >
                        재발급
                    </button>
                </div>
            </header>

            {/* 탭 네비게이션: 모바일 가로 스와이프 지원 */}
            <nav className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto no-scrollbar">
                <button
                    type="button"
                    onClick={() => setTab('facts')}
                    className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${tab === 'facts'
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                >
                    검증 팩트 리포트 ({facts.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('requests')}
                    className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${tab === 'requests'
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                >
                    검증 의뢰소 ({requests.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('about')}
                    className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${tab === 'about'
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                >
                    <span>📖</span>
                    <span>소개 및 검증원칙 (About)</span>
                </button>
            </nav>

            {/* 팩트 리포트 탭 */}
            {tab === 'facts' && (
                <FactTabs
                    facts={facts}
                    loading={false}
                    onOpenAdminModal={() => setIsAdminModalOpen(true)}
                    onDeleteFact={(deletedId) => {
                        setFacts((prev) => prev.filter((f) => f.id !== deletedId));
                    }}
                />
            )}

            {/* 검증 의뢰소 탭 */}
            {tab === 'requests' && (
                <RequestList
                    requests={requests}
                    loading={false}
                    citizenId={citizenId}
                    userVotes={userVotes}
                    onVote={handleVote}
                    onOpenModal={() => setIsRequestModalOpen(true)}
                    onVoteUpdate={(reqId: any, up: any, down: any) => {
                        setRequests((prev) =>
                            prev.map((r) =>
                                r.id === reqId ? { ...r, upvotes: up, downvotes: down } : r
                            )
                        );
                    }}
                />
            )}

            {/* 소개 및 검증 방법론 탭 */}
            {tab === 'about' && (
                <AboutSection />
            )}

            {/* 하단 푸터 */}
            <footer className="border-t border-neutral-800 pt-6 pb-8 text-center text-xs text-neutral-500 space-y-1.5">
                <div className="flex justify-center gap-4 text-[11px] text-neutral-400">
                    <button
                        type="button"
                        onClick={() => setTab('about')}
                        className="hover:text-white underline cursor-pointer"
                    >
                        운영 원칙 및 5단계 검증 방법론
                    </button>
                    <span>•</span>
                    <span>공적 1차 사료 원칙</span>
                    <span>•</span>
                    <span>비당파성 독립 아카이브</span>
                </div>
                <p className="text-[11px] text-neutral-600">
                    © 2026 FactRepo. 공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브. All rights reserved.
                </p>
            </footer>

            {/* 모달 팝업 */}
            <RequestModal
                isOpen={isRequestModalOpen}
                citizenId={citizenId}
                onClose={() => setIsRequestModalOpen(false)}
                onSuccess={(newReq) => {
                    setRequests((prev) => [newReq, ...prev]);
                    setUserVotes((prev) => {
                        const updated = { ...prev, [newReq.id]: 'up' as const };
                        try {
                            localStorage.setItem('factrepo_user_votes', JSON.stringify(updated));
                        } catch (e) {
                            console.error('로컬스토리지 저장 실패:', e);
                        }
                        return updated;
                    });
                }}
            />

            <AdminFactModal
                isOpen={isAdminModalOpen}
                requests={requests}
                onClose={() => setIsAdminModalOpen(false)}
                onSuccess={(newFact) => {
                    setFacts((prev) => [newFact, ...prev]);
                }}
            />
        </div>
    );
}