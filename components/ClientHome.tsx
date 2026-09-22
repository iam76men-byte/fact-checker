'use client';

import { useState, useEffect } from 'react';
import RequestList, { RequestItem } from './RequestList';
import FactTabs, { FactItem } from './FactTabs';
import RequestModal from './RequestModal';
import AdminFactModal from './AdminFactModal';

interface ClientHomeProps {
    initialFacts: FactItem[];
    initialRequests: RequestItem[];
}

export default function ClientHome({ initialFacts, initialRequests }: ClientHomeProps) {
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<'facts' | 'requests'>('facts');
    const [citizenId, setCitizenId] = useState<string>('진실탐정_시민');

    const [facts, setFacts] = useState<FactItem[]>(initialFacts);
    const [requests, setRequests] = useState<RequestItem[]>(initialRequests);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

    // 브라우저 마운트 완료 후에만 localStorage에 접근 (Hydration Mismatch 방지)
    useEffect(() => {
        setMounted(true);
        try {
            let stored = localStorage.getItem('factrepo_citizen_id');
            if (!stored) {
                const randomNum = Math.floor(100 + Math.random() * 900);
                stored = `진실탐정_${randomNum}호`;
                localStorage.setItem('factrepo_citizen_id', stored);
            }
            setCitizenId(stored);
        } catch {
            setCitizenId(`진실탐정_${Math.floor(100 + Math.random() * 900)}호`);
        }
    }, []);

    const handleRenewCitizenId = () => {
        try {
            const randomNum = Math.floor(100 + Math.random() * 900);
            const newId = `진실탐정_${randomNum}호`;
            localStorage.setItem('factrepo_citizen_id', newId);
            setCitizenId(newId);
        } catch {
            setCitizenId(`진실탐정_${Math.floor(100 + Math.random() * 900)}호`);
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
                            Live
                        </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                        공공데이터 기반 실전 팩트체크 &amp; 탄약 보급소
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

            {/* 탭 네비게이션 */}
            <nav className="flex gap-2 border-b border-neutral-800 pb-2">
                <button
                    type="button"
                    onClick={() => setTab('facts')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${tab === 'facts'
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                >
                    오늘의 팩트 TOP 3 ({facts.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('requests')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${tab === 'requests'
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                >
                    검증 의뢰소 ({requests.length})
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

            {/* 모달 팝업 */}
            <RequestModal
                isOpen={isRequestModalOpen}
                citizenId={citizenId}
                onClose={() => setIsRequestModalOpen(false)}
                onSuccess={(newReq) => {
                    setRequests((prev) => [newReq, ...prev]);
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