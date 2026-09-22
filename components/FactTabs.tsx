'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

export interface FactItem {
    id: number;
    title: string;
    distortion: string;
    fact_summary: string;
    primary_source: string;
    source_url?: string;
    pdf_url?: string;
    hashtags?: string[] | string;
    published_at: string;
}

interface FactTabsProps {
    facts: FactItem[];
    loading: boolean;
    onOpenAdminModal: () => void;
    onOpenEditModal?: (fact: FactItem) => void;
    onDeleteFact?: (id: number) => void;
}

const cleanBracketHeader = (text: string) => {
    if (!text) return '';
    return text.replace(/^(\[[^\]]+\]|【[^】]+】)\s*\n*/, '').trim();
};

const getFactVerdict = (factSummary: string) => {
    if (!factSummary) return null;

    if (/대체로\s*사실\s*아님/i.test(factSummary)) {
        return {
            label: '🔸 대체로 사실 아님',
            color: 'bg-rose-950/80 text-rose-300 border-rose-700/80',
        };
    }
    if (/사실\s*아님/i.test(factSummary)) {
        return {
            label: '❌ 사실 아님',
            color: 'bg-red-950/80 text-red-300 border-red-700/80',
        };
    }
    if (/절반의\s*사실/i.test(factSummary)) {
        return {
            label: '⚠️ 절반의 사실',
            color: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
        };
    }
    if (/대체로\s*사실/i.test(factSummary)) {
        return {
            label: '🔹 대체로 사실',
            color: 'bg-blue-950/80 text-blue-300 border-blue-700/80',
        };
    }
    if (/(^|[^\w가-힣])사실([^\w가-힣]|$)/i.test(factSummary)) {
        return {
            label: '✅ 사실',
            color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
        };
    }

    return {
        label: '📋 검증 완료',
        color: 'bg-neutral-800 text-neutral-300 border-neutral-600',
    };
};

const getHashtagList = (tags?: string[] | string): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean);
    if (typeof tags === 'string') {
        return tags
            .split(/[\s,]+/)
            .map((t) => t.trim().replace(/^#/, ''))
            .filter(Boolean);
    }
    return [];
};

export default function FactTabs({ facts, loading, onOpenAdminModal, onOpenEditModal, onDeleteFact }: FactTabsProps) {
    const { user } = useAuth();
    const isAdmin = user?.displayId === 'iam76men';

    const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    // 모바일/PC 반응형 인앱 텍스트 보고서 모달 열람 상태
    const [viewingFact, setViewingFact] = useState<{ fact: FactItem; index: number } | null>(null);

    // 검색어 및 달력 선택 날짜
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD

    const handleOpenDeleteModal = (id: number, title: string) => {
        setDeleteTarget({ id, title });
        setAdminPassword('');
    };

    const handleConfirmDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deleteTarget) return;

        if (!adminPassword) {
            alert('관리자 암호를 입력해주세요.');
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch('/api/admin/delete-fact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deleteTarget.id, adminKey: adminPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '관리자 인증 실패');
            }

            alert('팩트 리포트가 성공적으로 삭제되었습니다.');

            if (onDeleteFact) {
                onDeleteFact(deleteTarget.id);
            } else {
                window.location.reload();
            }

            setDeleteTarget(null);
            setAdminPassword('');
        } catch (err: any) {
            alert('삭제 실패: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    // 브라우저 기본 인쇄창 호출 (인쇄/PDF 저장용)
    const handlePrintPdf = (fact: FactItem, index: number) => {
        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            alert('팝업 차단을 해제해주세요.');
            return;
        }

        const reportHtml = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8">
        <title>FactRepo 검증보고서 - ${fact.title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
            color: #1e293b;
            background: #f8fafc;
            line-height: 1.7;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .toolbar {
            position: sticky;
            top: 0;
            background: #0f172a;
            color: white;
            padding: 14px 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 100;
          }
          .toolbar-title { font-size: 14px; font-weight: 600; letter-spacing: -0.2px; }
          .toolbar-btns { display: flex; gap: 10px; }
          .btn {
            border: none;
            padding: 7px 16px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-print { background: #dc2626; color: white; }
          .btn-print:hover { background: #b91c1c; }
          .btn-close { background: #334155; color: #cbd5e1; }
          .btn-close:hover { background: #475569; }

          .paper {
            background: white;
            max-width: 800px;
            margin: 30px auto;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border-radius: 8px;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            font-size: 19pt;
            margin: 0;
            font-weight: 800;
            color: #dc2626;
            letter-spacing: -0.5px;
          }
          .meta {
            font-size: 9pt;
            color: #64748b;
            text-align: right;
            line-height: 1.5;
          }
          .report-title {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 5px solid #dc2626;
            padding: 16px 20px;
            font-size: 13pt;
            font-weight: 700;
            margin-bottom: 26px;
            border-radius: 0 6px 6px 0;
            line-height: 1.55;
            color: #0f172a;
          }
          .section {
            margin-bottom: 26px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .section-title {
            font-size: 11pt;
            font-weight: 700;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1.5px solid #e2e8f0;
            display: flex;
            align-items: center;
          }
          .distortion-title { color: #dc2626; }
          .fact-title { color: #059669; }
          .source-title { color: #2563eb; }
          .box {
            background: #fafafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 16px 20px;
            white-space: pre-wrap;
            font-size: 10pt;
            line-height: 1.8;
            color: #334155;
            word-break: keep-all;
            letter-spacing: -0.2px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 14px;
            border-top: 1px dashed #cbd5e1;
            font-size: 8.5pt;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }

          @media print {
            body {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .toolbar { display: none !important; }
            .paper {
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              max-width: 100% !important;
              border-radius: 0 !important;
            }
            .section {
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 22px !important;
            }
            .box {
              padding: 14px 18px !important;
              line-height: 1.75 !important;
              background: #fbfbfd !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div class="toolbar-title">📄 FactRepo 공식 검증 보고서 열람</div>
          <div class="toolbar-btns">
            <button class="btn btn-print" onclick="window.print()">🖨️ PDF 저장 / 인쇄</button>
            <button class="btn btn-close" onclick="window.close()">창 닫기</button>
          </div>
        </div>

        <div class="paper">
          <div class="header">
            <div>
              <h1>FactRepo 사실조사 검증보고서</h1>
              <div style="font-size: 9pt; color: #64748b; margin-top: 4px;">공공데이터 및 AI 팩트 체크 교차검증 센터</div>
            </div>
            <div class="meta">
              문서식별: FR-TOP${index + 1}-${fact.id}<br>
              발행일자: ${new Date(fact.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div class="report-title">
            검증 안건: ${fact.title}
          </div>

          <div class="section">
            <div class="section-title distortion-title">1. 배경 및 쟁점·정황</div>
            <div class="box">${cleanBracketHeader(fact.distortion) || '기록된 내용이 없습니다.'}</div>
          </div>

          <div class="section">
            <div class="section-title fact-title">2. 객관적 핵심 사실 (Fact Summary)</div>
            <div class="box">${cleanBracketHeader(fact.fact_summary) || '기록된 내용이 없습니다.'}</div>
          </div>

          <div class="section">
            <div class="section-title source-title">3. AI 팩트 체크</div>
            <div class="box">${cleanBracketHeader(fact.primary_source) || '기록된 내용이 없습니다.'}${fact.source_url ? '\n\n참조 원문 링크: ' + fact.source_url : ''}</div>
          </div>

          <div class="footer">
            <span>FactRepo Public Verification Unit</span>
            <span>본 문서는 공공데이터와 공적 기록물에 기반하여 작성되었습니다.</span>
          </div>
        </div>
      </body>
      </html>
    `;

        reportWindow.document.open();
        reportWindow.document.write(reportHtml);
        reportWindow.document.close();
    };

    // 검색어 및 날짜 필터링 적용 (최신순 3건 슬라이싱)
    const filteredFacts = useMemo(() => {
        let list = [...facts];

        // 날짜 필터 (발행일 기준 YYYY-MM-DD)
        if (selectedDate) {
            list = list.filter((fact) => {
                const pubDate = new Date(fact.published_at).toISOString().split('T')[0];
                return pubDate === selectedDate;
            });
        }

        // 검색어 필터 (사용자 요청: 제목과 해시태그만으로 검색)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
            list = list.filter((fact) => {
                const matchTitle = fact.title.toLowerCase().includes(q);
                const tags = getHashtagList(fact.hashtags).map((t) => t.toLowerCase());
                const matchHashtags = tags.some((t) => t.includes(q));
                return matchTitle || matchHashtags;
            });
        }

        // 전체 팩트 리포트 노출 (최신순)
        return list;
    }, [facts, searchQuery, selectedDate]);

    return (
        <div className="space-y-4">
            {/* 검색 및 필터 헤더 */}
            <div className="bg-neutral-800/60 p-4 rounded-xl border border-neutral-700/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>🏛️</span> 오늘의 검증 팩트 리포트
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">
                            핵심 왜곡 프레임을 확인하고, [보고서 보기]를 통해 객관적 사실과 AI 팩트 체크를 바로 열람하세요.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
                        <div className="relative flex-1 sm:flex-initial">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="제목 또는 #해시태그 검색..."
                                className="w-full sm:w-48 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1.5 text-neutral-400 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5">
                            <label htmlFor="date-picker" className="text-xs text-neutral-400 cursor-pointer">
                                📅
                            </label>
                            <input
                                id="date-picker"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer [color-scheme:dark]"
                            />
                        </div>

                        {(selectedDate || searchQuery) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDate('');
                                    setSearchQuery('');
                                }}
                                className="text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                                전체보기
                            </button>
                        )}

                        <button
                            onClick={onOpenAdminModal}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition shadow shrink-0 whitespace-nowrap cursor-pointer"
                        >
                            ⚙️ 팩트 발행 (관리자)
                        </button>
                    </div>
                </div>
            </div>

            {/* 리스트 표시 영역 */}
            {loading ? (
                <div className="text-center py-12 text-neutral-400 text-sm">
                    팩트 리포트를 불러오는 중입니다...
                </div>
            ) : filteredFacts.length === 0 ? (
                <div className="py-16 text-center bg-neutral-800/40 border border-neutral-800 rounded-xl">
                    <span className="text-2xl mb-2 block">🔍</span>
                    <h3 className="text-base font-semibold text-white mb-1">
                        {selectedDate || searchQuery ? '조건에 맞는 리포트가 없습니다.' : '검증 완료된 팩트 리포트 준비 중'}
                    </h3>
                    <p className="text-xs text-neutral-400 mb-4">
                        {selectedDate || searchQuery
                            ? '다른 날짜를 선택하거나 검색어를 변경해 보세요.'
                            : '시민 검증 의뢰소에서 상위 의혹부터 AI 팩트 체크 조사를 거쳐 발행됩니다.'}
                    </p>
                    {(selectedDate || searchQuery) && (
                        <button
                            onClick={() => {
                                setSelectedDate('');
                                setSearchQuery('');
                            }}
                            className="text-xs text-red-400 hover:underline"
                        >
                            필터 초기화하고 최신순 보기 &rarr;
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3.5">
                    {filteredFacts.map((fact, index) => (
                        <div
                            key={fact.id}
                            className="bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition rounded-xl p-4 md:p-5 space-y-3 shadow-md"
                        >
                            {/* 상단 헤더: TOP 배지, 제목, 보고서 열람, 삭제, 발행일 */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-neutral-700/70 pb-3 gap-2.5">
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                    <span className="bg-red-950 text-red-400 text-xs px-2.5 py-0.5 rounded font-bold border border-red-800 shrink-0 mt-0.5">
                                        TOP {index + 1}
                                    </span>
                                    <h4 className="font-bold text-neutral-100 text-sm md:text-base leading-snug break-keep sm:break-normal">
                                        {fact.title}
                                    </h4>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t border-neutral-700/40 sm:border-0 pt-2 sm:pt-0">
                                    <span className="text-xs text-neutral-400 sm:order-last sm:pl-1">
                                        {new Date(fact.published_at).toLocaleDateString('ko-KR', {
                                            month: 'numeric',
                                            day: 'numeric',
                                        })}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        {/* 인앱 모달 열람 버튼 */}
                                        <button
                                            type="button"
                                            onClick={() => setViewingFact({ fact, index })}
                                            className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold shadow cursor-pointer active:scale-95"
                                            title="검증보고서 보기"
                                        >
                                            <span>📄</span>
                                            <span>보고서 보기</span>
                                        </button>

                                        <Link
                                            href={`/rebuttals?factId=${fact.id}`}
                                            className="bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition font-semibold cursor-pointer active:scale-95"
                                            title="이 팩트에 대해 반론 제기하기"
                                        >
                                            <span>⚖️</span>
                                            <span>반론</span>
                                        </Link>

                                        {/* 관리자(iam76men) 리포트 수정 버튼 */}
                                        {isAdmin && onOpenEditModal && (
                                            <button
                                                type="button"
                                                onClick={() => onOpenEditModal(fact)}
                                                className="bg-blue-950/70 hover:bg-blue-900/90 text-blue-300 border border-blue-800/80 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition font-semibold cursor-pointer active:scale-95"
                                                title="관리자 전용 팩트 리포트 정정(수정)"
                                            >
                                                <span>✏️</span>
                                                <span>변경</span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleOpenDeleteModal(fact.id, fact.title)}
                                            className="bg-neutral-900 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 transition border border-neutral-700 hover:border-red-800 cursor-pointer"
                                            title="관리자 전용 삭제"
                                        >
                                            <span>🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 배경과 쟁점 정황 요약 카드 */}
                            <div className="bg-neutral-900/60 border border-neutral-700/80 rounded-xl p-3 sm:p-4 text-xs shadow-inner">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-white font-bold text-xs sm:text-[13px] flex items-center gap-1.5">
                                        <span>📌</span> 배경과 쟁점 정황
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setViewingFact({ fact, index })}
                                        className="cursor-pointer group"
                                        title="클릭 시 검증보고서 상세 보기"
                                    >
                                        {(() => {
                                            const verdict = getFactVerdict(fact.fact_summary);
                                            return verdict ? (
                                                <span className={`inline-flex items-center px-3.5 py-1 rounded-lg text-xs sm:text-sm font-extrabold border transition group-hover:brightness-110 shadow-sm tracking-wide ${verdict.color}`}>
                                                    {verdict.label}
                                                </span>
                                            ) : null;
                                        })()}
                                    </button>
                                </div>
                                <p className="text-neutral-200 whitespace-pre-wrap leading-relaxed text-xs sm:text-[13px]">
                                    {cleanBracketHeader(fact.distortion)}
                                </p>

                                {/* 해시태그 표시 영역 */}
                                {getHashtagList(fact.hashtags).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-neutral-800/80 mt-2.5">
                                        {getHashtagList(fact.hashtags).map((tag, tIdx) => (
                                            <button
                                                key={tIdx}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSearchQuery(tag);
                                                }}
                                                className="inline-flex items-center text-[11px] font-medium text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900/70 border border-red-800/60 px-2 py-0.5 rounded-md transition cursor-pointer"
                                                title={`#${tag} 검색 필터링`}
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 인앱 반응형 팩트 리포트 텍스트 뷰어 모달 (모바일/PC 공용) */}
            {viewingFact && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
                        {/* 모달 상단 헤더 */}
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="bg-red-950 text-red-400 text-xs px-2.5 py-0.5 rounded font-bold border border-red-800 shrink-0">
                                    TOP {viewingFact.index + 1}
                                </span>
                                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                                    FactRepo 공식 검증 리포트
                                </h3>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handlePrintPdf(viewingFact.fact, viewingFact.index)}
                                    className="hidden sm:inline-flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-700 transition cursor-pointer"
                                    title="인쇄용 A4 PDF 양식 출력"
                                >
                                    <span>🖨️</span>
                                    <span>PDF 인쇄</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingFact(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer text-base"
                                    title="닫기"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* 모달 본문 (모바일에서 텍스트가 시원하게 읽히는 영역) */}
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto text-xs sm:text-sm">
                            {/* 리포트 제목 */}
                            <div className="bg-neutral-800/80 border border-neutral-700 border-l-4 border-l-red-600 rounded-xl p-3.5 sm:p-4 shadow-sm">
                                <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">
                                    검증 안건
                                </div>
                                <h2 className="text-sm sm:text-lg font-black text-white leading-snug">
                                    {viewingFact.fact.title}
                                </h2>
                                <div className="text-[11px] text-neutral-400 mt-2 flex items-center justify-between">
                                    <span>문서 식별: FR-TOP{viewingFact.index + 1}-{viewingFact.fact.id}</span>
                                    <span>발행: {new Date(viewingFact.fact.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>

                                {/* 모달 내 해시태그 */}
                                {getHashtagList(viewingFact.fact.hashtags).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-neutral-700/60">
                                        {getHashtagList(viewingFact.fact.hashtags).map((tag, tIdx) => (
                                            <span
                                                key={tIdx}
                                                className="text-xs text-red-300 bg-red-950/70 border border-red-800/70 px-2 py-0.5 rounded-md font-medium"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 1. 배경 및 쟁점·정황 */}
                            <div className="bg-neutral-800/60 border border-neutral-700/80 rounded-xl p-4 sm:p-5 space-y-2">
                                <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5 pb-2 border-b border-neutral-700/60">
                                    <span>📌</span>
                                    <span>1. 배경 및 쟁점·정황</span>
                                </div>
                                <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans pt-1">
                                    {cleanBracketHeader(viewingFact.fact.distortion) || '기록된 내용이 없습니다.'}
                                </div>
                            </div>

                            {/* 2. 객관적 핵심 사실 (Fact Summary) */}
                            <div className="bg-neutral-800/60 border border-emerald-800/50 rounded-xl p-4 sm:p-5 space-y-2">
                                <div className="font-bold text-emerald-400 text-xs sm:text-sm flex items-center justify-between pb-2 border-b border-neutral-700/60">
                                    <span className="flex items-center gap-1.5">
                                        <span>✅</span>
                                        <span>2. 객관적 핵심 사실 (Fact Summary)</span>
                                    </span>
                                    {(() => {
                                        const verdict = getFactVerdict(viewingFact.fact.fact_summary);
                                        return verdict ? (
                                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border shadow-sm ${verdict.color}`}>
                                                {verdict.label}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                                <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans pt-1">
                                    {cleanBracketHeader(viewingFact.fact.fact_summary) || '기록된 내용이 없습니다.'}
                                </div>
                            </div>

                            {/* 3. AI 팩트 체크 */}
                            <div className="bg-neutral-800/60 border border-blue-800/50 rounded-xl p-4 sm:p-5 space-y-2">
                                <div className="font-bold text-blue-400 text-xs sm:text-sm flex items-center gap-1.5 pb-2 border-b border-neutral-700/60">
                                    <span>🏛️</span>
                                    <span>3. AI 팩트 체크</span>
                                </div>
                                <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans pt-1">
                                    {cleanBracketHeader(viewingFact.fact.primary_source) || '기록된 내용이 없습니다.'}
                                </div>

                                {viewingFact.fact.source_url && (
                                    <div className="pt-2 border-t border-neutral-700/50 text-xs">
                                        <span className="text-neutral-400">근거 원문 링크: </span>
                                        <a
                                            href={viewingFact.fact.source_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-400 hover:text-blue-300 underline break-all"
                                        >
                                            {viewingFact.fact.source_url}
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="text-[11px] text-neutral-500 text-center pt-2">
                                본 검증보고서는 FactRepo 공공데이터 및 1차 사료 검증 원칙에 따라 영구 아카이빙되었습니다.
                            </div>
                        </div>

                        {/* 모달 하단 푸터 버튼 */}
                        <div className="px-4 sm:px-6 py-3.5 border-t border-neutral-800 bg-neutral-900/90 flex flex-wrap items-center justify-end gap-2 shrink-0">
                            <Link
                                href={`/rebuttals?factId=${viewingFact.fact.id}`}
                                className="px-3.5 py-2 bg-amber-950/70 hover:bg-amber-900 text-amber-300 font-semibold text-xs rounded-lg border border-amber-700/80 transition flex items-center gap-1.5 cursor-pointer"
                                title="이 검증에 대해 반론 제기하기"
                            >
                                <span>⚖️</span>
                                <span>반론 제기하기</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => handlePrintPdf(viewingFact.fact, viewingFact.index)}
                                className="hidden sm:inline-flex py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-lg border border-neutral-700 transition"
                            >
                                🖨️ PDF 인쇄
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewingFact(null)}
                                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition shadow cursor-pointer"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 관리자 암호 인증 모달 */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                            <span>🔒</span> 관리자 인증 필요
                        </h3>
                        <p className="text-neutral-400 text-xs mb-3 break-keep">
                            다음 팩트 리포트를 영구 삭제합니다:<br />
                            <span className="text-neutral-200 font-semibold mt-1 block truncate">
                                "{deleteTarget.title}"
                            </span>
                        </p>

                        <form onSubmit={handleConfirmDelete} className="space-y-4">
                            <div>
                                <label className="block text-neutral-300 text-xs font-medium mb-1">
                                    관리자 암호 입력
                                </label>
                                <input
                                    type="password"
                                    autoFocus
                                    required
                                    placeholder="••••••••••••"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={deleting}
                                    onClick={() => {
                                        setDeleteTarget(null);
                                        setAdminPassword('');
                                    }}
                                    className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded text-xs transition"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleting}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white rounded text-xs font-semibold transition"
                                >
                                    {deleting ? '삭제 중...' : '영구 삭제'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}