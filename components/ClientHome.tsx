'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from './Header';
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

    // 브라우저 마운트 완료 후에만 localStorage 및 URL 파라미터에 접근 (Hydration Mismatch 방지)
    useEffect(() => {
        setMounted(true);
        try {
            // URL 쿼리 파라미터의 tab 확인 (?tab=requests, ?tab=about)
            const urlParams = new URLSearchParams(window.location.search);
            const queryTab = urlParams.get('tab');
            if (queryTab === 'requests' || queryTab === 'about' || queryTab === 'facts') {
                setTab(queryTab);
            }

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
            {/* 상단 글로벌 헤더 및 통합 네비게이션 */}
            <Header
                activeTab={tab}
                onTabChange={(t) => setTab(t)}
                factsCount={facts.length}
                requestsCount={requests.length}
                nickname={mounted ? citizenId : '시민 확인 중...'}
                onResetIdentity={handleRenewCitizenId}
            />

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