'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import RebuttalModal, { RebuttalItem, FactItemForRebuttal } from '@/components/RebuttalModal';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function RebuttalsContent() {
    const searchParams = useSearchParams();
    const factIdParam = searchParams.get('factId');

    const [rebuttals, setRebuttals] = useState<RebuttalItem[]>([]);
    const [facts, setFacts] = useState<FactItemForRebuttal[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsTableSetup, setNeedsTableSetup] = useState(false);

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RebuttalItem | null>(null);
    const [targetFactId, setTargetFactId] = useState<number | null>(factIdParam ? Number(factIdParam) : null);

    // 비밀번호 확인 팝업 상태 (삭제 또는 수정 시)
    const [authAction, setAuthAction] = useState<'edit' | 'delete' | null>(null);
    const [actionTargetItem, setActionTargetItem] = useState<RebuttalItem | null>(null);
    const [inputPassword, setInputPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // 데이터 로드
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. 팩트 목록 로드
            const { data: factData } = await supabase
                .from('facts')
                .select('id, title, fact_summary, distortion')
                .order('id', { ascending: false });

            if (factData) {
                setFacts(factData);
            }

            // 2. 반론 목록 로드
            const res = await fetch('/api/rebuttals');
            const data = await res.json();

            if (data.needsTableSetup) {
                setNeedsTableSetup(true);
                setRebuttals([]);
            } else if (data.rebuttals) {
                setRebuttals(data.rebuttals);
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // URL 파라미터로 factId가 넘어왔을 경우 모달 자동 오픈
    useEffect(() => {
        if (factIdParam && facts.length > 0) {
            setTargetFactId(Number(factIdParam));
            setIsModalOpen(true);
        }
    }, [factIdParam, facts]);

    // 판정 결론 뱃지 스타일
    const getVerdictBadgeStyle = (verdict: string) => {
        if (verdict.includes('사실 아님') || verdict.includes('거짓')) {
            return 'bg-red-950/80 text-red-300 border-red-700/80';
        }
        if (verdict.includes('대체로 사실 아님') || verdict.includes('왜곡')) {
            return 'bg-amber-950/80 text-amber-300 border-amber-700/80';
        }
        if (verdict.includes('절반의 사실')) {
            return 'bg-yellow-950/80 text-yellow-300 border-yellow-700/80';
        }
        if (verdict.includes('사실')) {
            return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80';
        }
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    };

    // 반론 추가/수정 완료 핸들러
    const handleSuccess = (item: RebuttalItem, isEdit: boolean) => {
        if (isEdit) {
            setRebuttals((prev) => prev.map((r) => (r.id === item.id ? { ...r, ...item } : r)));
            alert('반론 내용이 성공적으로 정정되었습니다.');
        } else {
            setRebuttals((prev) => [item, ...prev]);
            alert('반론이 성공적으로 등록되었습니다.');
        }
    };

    // 수정 버튼 클릭 -> 비밀번호 확인창 오픈
    const handleStartEdit = (item: RebuttalItem) => {
        setActionTargetItem(item);
        setAuthAction('edit');
        setInputPassword('');
        setAuthError('');
    };

    // 삭제 버튼 클릭 -> 비밀번호 확인창 오픈
    const handleStartDelete = (item: RebuttalItem) => {
        setActionTargetItem(item);
        setAuthAction('delete');
        setInputPassword('');
        setAuthError('');
    };

    // 비밀번호 검증 및 작업 실행
    const handleConfirmAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionTargetItem || !authAction) return;

        if (!inputPassword.trim()) {
            setAuthError('비밀번호를 입력해주세요.');
            return;
        }

        setAuthLoading(true);
        setAuthError('');

        try {
            if (authAction === 'delete') {
                // 소프트 딜리트 요청
                const res = await fetch('/api/rebuttals', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: actionTargetItem.id,
                        password: inputPassword.trim(),
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '삭제 실패');

                // 리스트에서 즉시 제거
                setRebuttals((prev) => prev.filter((r) => r.id !== actionTargetItem.id));
                alert('반론 게시물이 성공적으로 삭제(비공개 처리)되었습니다.');
                setAuthAction(null);
                setActionTargetItem(null);
            } else if (authAction === 'edit') {
                // 수정 권한 인증 -> 통과 시 모달 열기
                setAuthAction(null);
                setEditingItem(actionTargetItem);
                setIsModalOpen(true);
            }
        } catch (err: any) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-neutral-100 flex flex-col font-sans">
            <Header activeTab="rebuttals" onTabChange={() => {}} />

            <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-10 space-y-6">
                {/* 상단 안내 배너 */}
                <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-neutral-700/80 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full text-xs text-neutral-300 font-medium">
                                <span>⚖️</span>
                                <span>시민·당사자 공식 반론 아카이브</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                FactRepo 반론 및 이의제기 게시판
                            </h1>
                            <p className="text-neutral-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                FactRepo는 투명하고 균형 잡힌 공익 검증을 위해, 발표된 팩트체크 리포트에 대한 시민, 취재 당사자, 소관 기관의 반론권을 100% 보장합니다. 객관적 사료와 함께 이의를 제기하실 수 있습니다.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingItem(null);
                                setTargetFactId(null);
                                setIsModalOpen(true);
                            }}
                            className="self-start md:self-auto shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs md:text-sm rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                            <span>✍️</span>
                            <span>공식 반론 제기하기</span>
                        </button>
                    </div>
                </div>

                {/* 테이블 셋업 필요 배너 (테이블이 없을 때) */}
                {needsTableSetup && (
                    <div className="bg-amber-950/50 border border-amber-800/80 rounded-xl p-5 text-xs text-amber-200 space-y-2">
                        <h4 className="font-bold text-sm flex items-center gap-1.5 text-amber-300">
                            <span>⚠️</span>
                            <span>Supabase rebuttals 테이블 생성 필요 안내</span>
                        </h4>
                        <p>
                            반론 게시판 기능을 사용하기 위해 데이터베이스 테이블 생성이 필요합니다. 프로젝트 루트의 <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">schema_rebuttals.sql</code> 파일의 내용을 <strong>Supabase 대시보드 &gt; SQL Editor</strong>에서 실행해 주세요.
                        </p>
                    </div>
                )}

                {/* 반론 목록 영역 */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <h2 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                            <span>📋</span>
                            <span>접수된 반론 목록 ({rebuttals.length}건)</span>
                        </h2>
                        <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-200">
                            ← 팩트체크 메인으로 돌아가기
                        </Link>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 text-neutral-400 text-sm">
                            반론 목록을 불러오는 중입니다...
                        </div>
                    ) : rebuttals.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-8 space-y-3">
                            <div className="text-3xl">⚖️</div>
                            <h3 className="text-base font-bold text-neutral-300">등록된 반론이 없습니다.</h3>
                            <p className="text-xs text-neutral-500 max-w-md mx-auto">
                                팩트체크 판정 결과에 대해 추가적인 사료나 소명 의견이 있으신 경우 언제든 반론을 제기하실 수 있습니다.
                            </p>
                            <button
                                onClick={() => {
                                    setEditingItem(null);
                                    setTargetFactId(null);
                                    setIsModalOpen(true);
                                }}
                                className="mt-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition"
                            >
                                첫 번째 반론 작성하기
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rebuttals.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700/90 rounded-2xl p-5 md:p-6 transition shadow-md space-y-4"
                                >
                                    {/* 1. 상단: 대상 팩트 정보 및 판정 배지 */}
                                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="space-y-1 min-w-0">
                                            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">
                                                반론 대상 팩트 안건
                                            </span>
                                            <h4 className="text-xs sm:text-sm font-bold text-neutral-200 truncate">
                                                {item.fact_title}
                                            </h4>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getVerdictBadgeStyle(item.fact_verdict)}`}>
                                                {item.fact_verdict}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 2. 본문: 반론 제목 및 작성자 정보 */}
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-base md:text-lg font-bold text-white leading-snug">
                                                {item.title}
                                            </h3>
                                            <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                                                <span className="text-neutral-300 font-medium">작성자: {item.author_name}</span>
                                                <span>•</span>
                                                <span>
                                                    {new Date(item.created_at).toLocaleDateString('ko-KR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 반론 본문 텍스트 (최대 2,000자) */}
                                        <div className="bg-neutral-950/50 rounded-xl p-4 border border-neutral-800/80 text-xs md:text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                            {item.content}
                                        </div>
                                    </div>

                                    {/* 3. 하단: 참고문헌 첨부 파일 및 정정/삭제 버튼 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800/80 text-xs">
                                        {/* 참고문헌 파일 */}
                                        <div>
                                            {item.reference_file_url ? (
                                                <a
                                                    href={item.reference_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 transition"
                                                >
                                                    <span>📎</span>
                                                    <span className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                                                        {item.reference_file_name || '참고문헌 파일 열람'}
                                                    </span>
                                                    {item.reference_file_size && (
                                                        <span className="text-neutral-400 text-[10px]">
                                                            ({(item.reference_file_size / 1024).toFixed(1)}KB)
                                                        </span>
                                                    )}
                                                </a>
                                            ) : (
                                                <span className="text-neutral-500 text-[11px]">별도 첨부된 소명 파일 없음</span>
                                            )}
                                        </div>

                                        {/* 정정 / 삭제 버튼 (비밀번호 인증) */}
                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(item)}
                                                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold rounded border border-neutral-700 transition cursor-pointer"
                                            >
                                                정정(수정)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStartDelete(item)}
                                                className="px-2.5 py-1 bg-neutral-800 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800 text-neutral-400 text-[11px] font-semibold rounded border border-neutral-700 transition cursor-pointer"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* 비밀번호 확인 모달 (정정 또는 소프트 딜리트 시) */}
            {authAction && actionTargetItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <span>🔒</span>
                                <span>{authAction === 'delete' ? '반론 게시물 삭제 확인' : '반론 게시물 정정 확인'}</span>
                            </h3>
                            <button
                                onClick={() => setAuthAction(null)}
                                className="text-neutral-400 hover:text-white text-lg leading-none cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-neutral-300 leading-relaxed">
                            작성 시 설정하신 <strong>비밀번호</strong>를 입력해주세요.
                            {authAction === 'delete' && ' 확인 시 즉시 목록에서 비공개(삭제) 처리됩니다.'}
                        </p>

                        <form onSubmit={handleConfirmAuth} className="space-y-3">
                            <input
                                type="password"
                                required
                                autoFocus
                                placeholder="비밀번호 입력"
                                value={inputPassword}
                                onChange={(e) => setInputPassword(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-red-500"
                            />

                            {authError && (
                                <p className="text-xs text-red-400 font-medium">{authError}</p>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAuthAction(null)}
                                    className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className={`px-4 py-1.5 text-white font-bold rounded-md transition shadow cursor-pointer ${
                                        authAction === 'delete'
                                            ? 'bg-red-600 hover:bg-red-500'
                                            : 'bg-emerald-600 hover:bg-emerald-500'
                                    }`}
                                >
                                    {authLoading ? '확인 중...' : authAction === 'delete' ? '삭제하기' : '정정하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 반론 작성 / 수정 모달 */}
            <RebuttalModal
                isOpen={isModalOpen}
                facts={facts}
                initialFactId={targetFactId}
                editingItem={editingItem}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }}
                onSuccess={handleSuccess}
            />
        </div>
    );
}

export default function RebuttalsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0f172a] text-white p-10 text-center">로딩 중...</div>}>
            <RebuttalsContent />
        </Suspense>
    );
}
