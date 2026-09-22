'use client';

import { useState, useMemo } from 'react';

export interface FactItem {
    id: number;
    title: string;
    distortion: string;
    fact_summary: string;
    primary_source: string;
    source_url?: string;
    pdf_url?: string;
    published_at: string;
}

interface FactTabsProps {
    facts: FactItem[];
    loading: boolean;
    onOpenAdminModal: () => void;
    onDeleteFact?: (id: number) => void;
}

const cleanBracketHeader = (text: string) => {
    if (!text) return '';
    return text.replace(/^(\[[^\]]+\]|【[^】]+】)\s*\n*/, '').trim();
};

export default function FactTabs({ facts, loading, onOpenAdminModal, onDeleteFact }: FactTabsProps) {
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [deleting, setDeleting] = useState(false);

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

    // 팩트 리포트 상세 뷰어 (전체 검증 사실 및 1차 사료 포함)
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
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", sans-serif;
            color: #1a1a1a;
            background: #f1f5f9;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .toolbar {
            position: sticky;
            top: 0;
            background: #0f172a;
            color: white;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 100;
          }
          .toolbar-title { font-size: 14px; font-weight: 600; }
          .toolbar-btns { display: flex; gap: 8px; }
          .btn {
            border: none;
            padding: 6px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 4px;
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
            margin: 28px auto;
            padding: 45px 50px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
            border-radius: 6px;
          }
          .header {
            border-bottom: 2px solid #111;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 { font-size: 20pt; margin: 0; font-weight: 800; color: #b91c1c; }
          .meta { font-size: 9pt; color: #555; text-align: right; line-height: 1.4; }
          .report-title {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 5px solid #b91c1c;
            padding: 14px 18px;
            font-size: 13pt;
            font-weight: 700;
            margin-bottom: 24px;
            border-radius: 0 4px 4px 0;
          }
          .section { margin-bottom: 22px; }
          .section-title {
            font-size: 11pt;
            font-weight: 700;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
          }
          .distortion-title { color: #b91c1c; }
          .fact-title { color: #047857; }
          .source-title { color: #1d4ed8; }
          .box {
            background: #fafafa;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 14px;
            white-space: pre-wrap;
            font-size: 10pt;
            line-height: 1.7;
          }
          .footer {
            margin-top: 36px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
            font-size: 8.5pt;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { background: white; }
            .toolbar { display: none !important; }
            .paper { margin: 0; padding: 0; box-shadow: none; max-width: 100%; }
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
              <div style="font-size: 9pt; color: #555; margin-top: 3px;">공공데이터 및 1차 사료 교차검증 센터</div>
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
            <div class="section-title distortion-title">1. 제기된 의혹 및 왜곡 프레임</div>
            <div class="box">${cleanBracketHeader(fact.distortion) || '내용 없음'}</div>
          </div>

          <div class="section">
            <div class="section-title fact-title">2. 객관적 핵심 사실 (Fact Summary)</div>
            <div class="box">${cleanBracketHeader(fact.fact_summary) || '내용 없음'}</div>
          </div>

          <div class="section">
            <div class="section-title source-title">3. 1차 사료 및 교차검증 근거</div>
            <div class="box">${cleanBracketHeader(fact.primary_source) || '내용 없음'}${fact.source_url ? '\n\n참조 링크: ' + fact.source_url : ''}</div>
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

    // 날짜/검색 필터링
    const filteredFacts = useMemo(() => {
        return facts
            .filter((fact) => {
                if (selectedDate) {
                    const itemDate = new Date(fact.published_at).toISOString().split('T')[0];
                    if (itemDate !== selectedDate) return false;
                }

                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    const inTitle = fact.title.toLowerCase().includes(query);
                    const inDistortion = fact.distortion.toLowerCase().includes(query);
                    const inFact = fact.fact_summary.toLowerCase().includes(query);
                    const inSource = fact.primary_source.toLowerCase().includes(query);
                    if (!inTitle && !inDistortion && !inFact && !inSource) return false;
                }

                return true;
            })
        {
            items.map((item, index) => {
                const rank = index + 1; // 1, 2, 3, 4, 5...

                return (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-800">
                        {/* 순위/번호 영역 */}
                        <div className="w-16 text-center">
                            {rank <= 3 ? (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    TOP {rank}
                                </span>
                            ) : (
                                <span className="text-sm font-semibold text-gray-400">
                                    {rank}
                                </span>
                            )}
                        </div>

                        {/* 본문 제목/내용 */}
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-white">{item.title}</h3>
                        </div>
                    </div>
                );
            })
        }
    }, [facts, selectedDate, searchQuery]);

    return (
        <div className="space-y-4">
            {/* 상단 검색 & 달력 바 */}
            <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>오늘의 팩트 리포트</span>
                            {selectedDate ? (
                                <span className="text-xs bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800 font-semibold">
                                    📅 {selectedDate} 리포트
                                </span>
                            ) : (
                                <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded">
                                    최신 TOP 3
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">
                            핵심 왜곡 프레임을 확인하고, [보고서 열람]을 통해 객관적 사실과 1차 사료를 확인하세요.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="의혹/키워드 검색..."
                                className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 w-44"
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
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition shadow"
                        >
                            ⚙️ 팩트 발행 (관리자)
                        </button>
                    </div>
                </div>
            </div>

            {/* 리스트 표시 영역: 왜곡 프레임 중심의 슬림 카드 */}
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
                            : '시민 검증 의뢰소에서 상위 의혹부터 1차 사료 조사를 거쳐 발행됩니다.'}
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
                <div className="space-y-3">
                    {filteredFacts.map((fact, index) => (
                        <div
                            key={fact.id}
                            className="bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition rounded-xl p-4 md:p-5 space-y-3 shadow-md"
                        >
                            {/* 상단 헤더: TOP 배지, 제목, 보고서 열람, 삭제, 발행일 */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-700/70 pb-3 gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="bg-red-950 text-red-400 text-xs px-2.5 py-0.5 rounded font-bold border border-red-800 shrink-0">
                                        TOP {index + 1}
                                    </span>
                                    <h4 className="font-semibold text-neutral-100 text-sm md:text-base leading-snug">
                                        {fact.title}
                                    </h4>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handlePrintPdf(fact, index)}
                                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold shadow"
                                        title="핵심 사실 및 1차 사료 전체 검증보고서 열람"
                                    >
                                        <span>📄</span>
                                        <span>보고서 열람</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleOpenDeleteModal(fact.id, fact.title)}
                                        className="bg-neutral-900 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition border border-neutral-700 hover:border-red-800"
                                        title="관리자 전용 삭제"
                                    >
                                        <span>🗑️</span>
                                        <span>삭제</span>
                                    </button>

                                    <span className="text-xs text-neutral-400 pl-1">
                                        {new Date(fact.published_at).toLocaleDateString('ko-KR', {
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* 왜곡된 프레임만 단독 표시 (카드 높이를 1/3로 축소) */}
                            <div className="bg-red-950/25 border border-red-900/50 rounded-lg p-3.5 text-xs">
                                <div className="font-bold text-red-400 mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <span>❌</span> 제기된 왜곡 프레임 / 의혹 주장
                                    </span>
                                    <span className="text-[11px] text-neutral-400 font-normal">
                                        상세 팩트 및 1차 사료는 [보고서 열람]에서 확인
                                    </span>
                                </div>
                                <p className="text-neutral-200 whitespace-pre-wrap leading-relaxed">
                                    {cleanBracketHeader(fact.distortion)}
                                </p>
                            </div>
                        </div>
                    ))}
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
                                    onClick={() => setDeleteTarget(null)}
                                    className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs rounded font-medium transition"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleting}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white text-xs font-semibold rounded transition"
                                >
                                    {deleting ? '인증 중...' : '삭제 확인'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}