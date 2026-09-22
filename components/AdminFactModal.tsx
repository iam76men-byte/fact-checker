'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { RequestItem } from './RequestList';
import { FactItem } from './FactTabs';

interface AdminFactModalProps {
    isOpen: boolean;
    requests: RequestItem[];
    onClose: () => void;
    onSuccess: (newFact: FactItem) => void;
}

export default function AdminFactModal({
    isOpen,
    requests,
    onClose,
    onSuccess,
}: AdminFactModalProps) {
    const [selectedReqId, setSelectedReqId] = useState<number | ''>('');
    const [title, setTitle] = useState('');
    const [distortion, setDistortion] = useState('');
    const [factSummary, setFactSummary] = useState('');
    const [primarySource, setPrimarySource] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    if (!isOpen) return null;

    // 의뢰글을 변경할 때 기존 입력값을 깨끗이 비워주는 로직 추가
    const handleSelectRequest = (reqIdStr: string) => {
        if (!reqIdStr) {
            setSelectedReqId('');
            setTitle('');
            setSourceUrl('');
            setDistortion('');
            setFactSummary('');
            setPrimarySource('');
            return;
        }
        const id = Number(reqIdStr);
        setSelectedReqId(id);
        const target = requests.find((r) => r.id === id);
        if (target) {
            setTitle(target.title);
            setSourceUrl(target.source_url || '');
            // 새로운 의뢰를 골랐으므로 기존 입력 칸들을 깨끗하게 리셋
            setDistortion('');
            setFactSummary('');
            setPrimarySource('');
        }
    };

    const handleGenerateAI = async () => {
        if (!title.trim()) {
            alert('먼저 의뢰를 선택하거나 리포트 제목을 입력해주세요.');
            return;
        }

        setGeneratingAI(true);
        try {
            const res = await fetch('/api/fact-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    source_url: sourceUrl.trim(),
                }),
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`서버 응답 오류 (상태코드 ${res.status})`);
            }

            if (!res.ok) throw new Error(data.error || 'AI 응답 실패');

            setDistortion(data.distortion || '');
            setFactSummary(data.fact_summary || '');
            setPrimarySource(data.primary_source || '');
        } catch (err: any) {
            alert('AI 초안 생성 실패: ' + err.message);
        } finally {
            setGeneratingAI(false);
        }
    };

    // 브라우저 기본 PDF 변환기 호출 (공식 보고서 A4 양식 레이아웃)
    const handleExportPDF = () => {
        if (!title.trim()) {
            alert('출력할 팩트체크 내용이 없습니다.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('팝업 창이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
            return;
        }

        const printHtml = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8">
        <title>FactRepo 검증보고서 - ${title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "맑은 고딕", sans-serif;
            color: #111;
            background: #fff;
            line-height: 1.6;
            font-size: 11pt;
            margin: 0;
            padding: 10px;
          }
          .header {
            border-bottom: 2px solid #111;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            font-size: 18pt;
            margin: 0;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .header .meta {
            font-size: 9pt;
            color: #555;
            text-align: right;
          }
          .report-title {
            background: #f4f4f5;
            border-left: 5px solid #dc2626;
            padding: 12px 16px;
            font-size: 13pt;
            font-weight: 700;
            margin-bottom: 24px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 11pt;
            font-weight: 700;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #ddd;
          }
          .distortion-title { color: #b91c1c; }
          .fact-title { color: #047857; }
          .source-title { color: #1d4ed8; }
          .box {
            background: #fafafa;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px 14px;
            white-space: pre-wrap;
            font-size: 10pt;
            line-height: 1.65;
          }
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px dashed #ccc;
            font-size: 8.5pt;
            color: #777;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>FactRepo 사실조사 검증보고서</h1>
            <div style="font-size: 9pt; color: #666; margin-top: 2px;">공공데이터 및 1차 사료 교차검증 센터</div>
          </div>
          <div class="meta">
            문서번호: FR-${Date.now().toString().slice(-6)}<br>
            발행일자: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div class="report-title">
          검증 안건: ${title}
        </div>

        <div class="section">
          <div class="section-title distortion-title">1. 제기된 의혹 및 왜곡 프레임 (대가 수수 / 청탁 의혹)</div>
          <div class="box">${distortion || '내용 없음'}</div>
        </div>

        <div class="section">
          <div class="section-title fact-title">2. 객관적 핵심 사실 (Fact Summary)</div>
          <div class="box">${factSummary || '내용 없음'}</div>
        </div>

        <div class="section">
          <div class="section-title source-title">3. 1차 사료 및 교차검증 근거</div>
          <div class="box">${primarySource || '내용 없음'}${sourceUrl ? '\n\n참조 링크: ' + sourceUrl : ''}</div>
        </div>

        <div class="footer">
          <span>FactRepo Public Verification Unit</span>
          <span>본 문서는 공공데이터와 공적 기록물에 기반하여 작성되었습니다.</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
    };

    // components/AdminFactModal.tsx 의 handleSubmit 부분 수정

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 발행 요청 전 암호 입력 확인
        if (!adminPassword) {
            alert('관리자 암호를 입력해주세요.');
            return;
        }

        // 관리자 암호 검증 (삭제 API와 동일한 환경변수 키 대조)
        if (!adminPassword || adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            alert('관리자 암호가 일치하지 않습니다.');
            return;
        }

        if (!title.trim() || !distortion.trim() || !factSummary.trim() || !primarySource.trim()) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }

        setSubmitting(true);

        let generatedPdfUrl: string | null = null;
        try {
            // 1. 서버에 보고서 생성 및 Storage 업로드 요청
            const pdfRes = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    distortion: distortion.trim(),
                    fact_summary: factSummary.trim(),
                    primary_source: primarySource.trim(),
                }),
            });
            const pdfData = await pdfRes.json();
            if (pdfData?.pdf_url) {
                generatedPdfUrl = pdfData.pdf_url;
            }
        } catch (e) {
            console.warn('PDF 보고서 연동 건너뜀:', e);
        }

        // 2. facts 테이블에 pdf_url과 함께 영구 저장
        const { data: insertData, error: insertError } = await supabase
            .from('facts')
            .insert([
                {
                    request_id: selectedReqId ? selectedReqId : null,
                    title: title.trim(),
                    distortion: distortion.trim(),
                    fact_summary: factSummary.trim(),
                    primary_source: primarySource.trim(),
                    source_url: sourceUrl.trim() || null,
                    pdf_url: generatedPdfUrl, // 생성된 보고서 링크 저장
                },
            ])
            .select();

        setSubmitting(false);

        if (insertError) {
            alert('팩트 리포트 저장 실패: ' + insertError.message);
            return;
        }

        if (insertData && insertData.length > 0) {
            onSuccess(insertData[0]);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto">
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 md:p-7 max-w-3xl w-full my-6 shadow-2xl">

                {/* 상단 헤더 영역 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-700/80 mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>⚙️</span> 팩트 리포트 발행 (관리자)
                        </h3>
                        <p className="text-neutral-400 text-xs mt-0.5">시민 의혹을 선택하고 1차 사료 기반 교차검증 리포트를 작성합니다.</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* PDF 보고서 다운로드/인쇄 버튼 */}
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition border border-neutral-600"
                            title="A4 규격의 인쇄용 PDF 보고서 출력"
                        >
                            <span>📄</span>
                            <span>PDF 보고서</span>
                        </button>

                        {/* AI 1차 초안 생성 버튼 */}
                        <button
                            type="button"
                            onClick={handleGenerateAI}
                            disabled={generatingAI || !title.trim()}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition shadow"
                        >
                            <span>{generatingAI ? '⏳' : '🤖'}</span>
                            <span>{generatingAI ? 'AI 분석 중...' : 'AI 1차 초안 생성'}</span>
                        </button>
                        <span className="text-xs bg-neutral-700/80 text-neutral-300 px-2 py-1.5 rounded border border-neutral-600">
                            검증팀
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block font-medium text-neutral-300 mb-1">
                                시민 검증 의뢰 선택 (내용 자동 로드)
                            </label>
                            <select
                                value={selectedReqId}
                                onChange={(e) => handleSelectRequest(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white focus:outline-none focus:border-red-500"
                            >
                                <option value="">-- 직접 입력 또는 의뢰 선택 --</option>
                                {requests.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        [{r.upvotes - r.downvotes > 0 ? `+${r.upvotes - r.downvotes}` : r.upvotes - r.downvotes}] {r.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-medium text-neutral-300 mb-1">근거 링크 URL (선택)</label>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={sourceUrl}
                                onChange={(e) => setSourceUrl(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white focus:outline-none focus:border-red-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-medium text-neutral-300 mb-1">리포트 제목 *</label>
                        <input
                            type="text"
                            required
                            placeholder="예: '○○사업 대가성 수수 의혹' 검증 결과"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white focus:outline-none focus:border-red-500"
                        />
                    </div>

                    {/* 왜곡 vs 사실: 2열 나란히 배치 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block font-semibold text-red-400 mb-1 flex items-center gap-1">
                                <span>❌</span> 왜곡된 주장 / 프레임 *
                            </label>
                            <textarea
                                required
                                rows={7}
                                placeholder="수수 대가 의혹 및 청탁 내용 요약"
                                value={distortion}
                                onChange={(e) => setDistortion(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white leading-relaxed focus:outline-none focus:border-red-500 font-mono text-[11px]"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                                <span>✅</span> 확인된 핵심 사실 (Fact) *
                            </label>
                            <textarea
                                required
                                rows={7}
                                placeholder="【핵심 사실 요약】 및 대가성/청탁 실행 여부 세부 검증 결과"
                                value={factSummary}
                                onChange={(e) => setFactSummary(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white leading-relaxed focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-medium text-neutral-300 mb-1">🏛️ 1차 사료 / 교차검증 근거 *</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="예: 공공기관 정보공개청구 원문, 국회 회의록 제○호, 전자관보 고시 제○○호 등"
                            value={primarySource}
                            onChange={(e) => setPrimarySource(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white leading-relaxed focus:outline-none focus:border-red-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-700/80">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md font-medium transition"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white font-semibold rounded-md transition shadow"
                        >
                            {submitting ? '발행 중...' : '팩트 리포트 발행하기'}
                        </button>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            관리자 암호
                        </label>
                        <input
                            type="password"
                            placeholder="관리자 암호를 입력하세요"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
                            required
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}