'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RequestItem } from './RequestList';
import { FactItem } from './FactTabs';

interface AdminFactModalProps {
    isOpen: boolean;
    requests: RequestItem[];
    editingFact?: FactItem | null;
    onClose: () => void;
    onSuccess: (fact: FactItem, isEdit: boolean) => void;
}

export default function AdminFactModal({
    isOpen,
    requests,
    editingFact,
    onClose,
    onSuccess,
}: AdminFactModalProps) {
    const [selectedReqId, setSelectedReqId] = useState<number | ''>('');
    const [title, setTitle] = useState('');
    const [distortion, setDistortion] = useState('');
    const [factSummary, setFactSummary] = useState('');
    const [primarySource, setPrimarySource] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [hashtags, setHashtags] = useState<string[]>([]);
    const [customTagInput, setCustomTagInput] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [summarizingEvidence, setSummarizingEvidence] = useState(false);

    // 모달이 열리거나 editingFact가 변경될 때 상태 초기화
    useEffect(() => {
        if (editingFact) {
            setSelectedReqId('');
            setTitle(editingFact.title || '');
            setDistortion(editingFact.distortion || '');
            setFactSummary(editingFact.fact_summary || '');
            setPrimarySource(editingFact.primary_source || '');
            setSourceUrl(editingFact.source_url || '');
            const rawTags = Array.isArray(editingFact.hashtags)
                ? editingFact.hashtags
                : typeof editingFact.hashtags === 'string' && editingFact.hashtags
                    ? editingFact.hashtags.split(/[\s,]+/)
                    : [];
            setHashtags(rawTags.map((t: string) => String(t).trim().replace(/^#/, '')).filter(Boolean));
        } else {
            setSelectedReqId('');
            setTitle('');
            setDistortion('');
            setFactSummary('');
            setPrimarySource('');
            setSourceUrl('');
            setHashtags([]);
        }
        setAdminPassword('');
        setCustomTagInput('');
    }, [editingFact, isOpen]);

    if (!isOpen) return null;

    // 왜곡 쟁점 AI 초안 생성 헬퍼
    const generateDistortionOnly = async (targetTitle: string, targetUrl: string) => {
        if (!targetTitle.trim()) return;
        setGeneratingAI(true);
        try {
            const res = await fetch('/api/fact-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: targetTitle.trim(),
                    source_url: targetUrl.trim(),
                    mode: 'draft',
                }),
            });
            const data = await res.json();
            if (res.ok && data) {
                setDistortion(data.distortion || '');
                setPrimarySource(''); // 근거는 직접 입력하도록 비워둠
                setFactSummary(data.fact_summary || '');
            }
        } catch (e) {
            console.warn('의뢰 선택 시 왜곡 쟁점 자동 생성 오류:', e);
        } finally {
            setGeneratingAI(false);
        }
    };

    // 의뢰글을 선택하면 왜곡 쟁점을 AI가 즉시 자동 생성
    const handleSelectRequest = (reqIdStr: string) => {
        if (!reqIdStr) {
            setSelectedReqId('');
            setTitle('');
            setSourceUrl('');
            setDistortion('');
            setFactSummary('');
            setPrimarySource('');
            setHashtags([]);
            return;
        }
        const id = Number(reqIdStr);
        setSelectedReqId(id);
        const target = requests.find((r) => r.id === id);
        if (target) {
            setTitle(target.title);
            const targetUrl = target.source_url || '';
            setSourceUrl(targetUrl);
            setPrimarySource('');
            setHashtags([]);

            // AI로 왜곡된 주장/쟁점 즉시 자동 생성
            generateDistortionOnly(target.title, targetUrl);
        }
    };

    // AI 팩트 체크 근거를 바탕으로 핵심 사실 요약 및 해시태그 5개 생성
    const handleSummarizeEvidence = async () => {
        if (!primarySource.trim()) {
            alert('먼저 아래 [AI 팩트 체크]에 판결문, 공문서, 통계, 공적 브리핑 등 검증 근거 내용을 입력해주세요.');
            return;
        }

        setSummarizingEvidence(true);
        try {
            const res = await fetch('/api/fact-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    distortion: distortion.trim(),
                    primary_source: primarySource.trim(),
                    source_url: sourceUrl.trim(),
                    mode: 'summarize_source',
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '요약 생성 실패');

            if (data.fact_summary) {
                setFactSummary(data.fact_summary);
            }
            if (Array.isArray(data.hashtags) && data.hashtags.length > 0) {
                setHashtags(data.hashtags);
            }
        } catch (err: any) {
            alert('AI 팩트 체크 기반 사실 요약 실패: ' + err.message);
        } finally {
            setSummarizingEvidence(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!title.trim()) {
            alert('먼저 의뢰를 선택하거나 리포트 제목을 입력해주세요.');
            return;
        }

        // 만약 AI 팩트 체크 근거가 이미 입력되어 있다면 사실 요약 및 해시태그 종합 수행
        if (primarySource.trim()) {
            await handleSummarizeEvidence();
            return;
        }

        await generateDistortionOnly(title, sourceUrl);
    };

    // 해시태그 추가/삭제 헬퍼
    const handleAddCustomTag = () => {
        const raw = customTagInput.trim().replace(/^#/, '');
        if (!raw) return;
        if (!hashtags.includes(raw)) {
            setHashtags([...hashtags, raw]);
        }
        setCustomTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setHashtags(hashtags.filter((t) => t !== tagToRemove));
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

        const tagsText = hashtags.length > 0 ? hashtags.join(' ') : '';

        const printHtml = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8">
        <title>FactRepo 검증보고서 - ${title}</title>
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
          .report-title-box {
            background: #f1f5f9;
            border-left: 6px solid #dc2626;
            padding: 16px 20px;
            border-radius: 4px;
            margin-bottom: 24px;
          }
          .report-title {
            font-size: 14pt;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .section {
            margin-bottom: 22px;
          }
          .section-title {
            font-size: 11pt;
            font-weight: 800;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .box {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 16px;
            white-space: pre-wrap;
            font-size: 9.5pt;
            line-height: 1.7;
          }
          .footer {
            margin-top: 36px;
            padding-top: 14px;
            border-top: 1px dashed #cbd5e1;
            font-size: 8pt;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { background: white; }
            .paper { box-shadow: none; margin: 0; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="paper">
          <div class="header">
            <div>
              <h1>FactRepo 사실조사 검증보고서</h1>
              <div style="font-size: 8.5pt; color: #475569; margin-top: 4px;">AI 팩트 체크 및 공공데이터 검증 센터</div>
            </div>
            <div class="meta">
              <div>발행일자: ${new Date().toLocaleDateString('ko-KR')}</div>
              <div>인증번호: FR-${Date.now().toString().slice(-6)}</div>
            </div>
          </div>

          <div class="report-title-box">
            <div style="font-size: 9pt; font-weight: 700; color: #dc2626; margin-bottom: 4px;">[검증 안건]</div>
            <div class="report-title">${title}</div>
            ${tagsText ? `<div style="font-size: 8.5pt; color: #64748b; margin-top: 6px;">키워드: ${tagsText}</div>` : ''}
          </div>

          <div class="section">
            <div class="section-title" style="color: #b91c1c;">1. 제기된 의혹 및 왜곡 프레임</div>
            <div class="box" style="border-left: 4px solid #ef4444;">${distortion}</div>
          </div>

          <div class="section">
            <div class="section-title" style="color: #047857;">2. 객관적 핵심 사실 (Fact Summary)</div>
            <div class="box" style="border-left: 4px solid #10b981;">${factSummary}</div>
          </div>

          <div class="section">
            <div class="section-title" style="color: #1d4ed8;">3. AI 팩트 체크</div>
            <div class="box" style="border-left: 4px solid #3b82f6;">${primarySource}${sourceUrl ? '\n\n참조 근거 원문: ' + sourceUrl : ''}</div>
          </div>

          <div class="footer">
            <span>FactRepo Public Verification Unit</span>
            <span>본 문서는 공공데이터와 공적 사료에 기반하여 발행되었습니다.</span>
          </div>
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 관리자 암호 확인
        if (!adminPassword) {
            alert('관리자 암호를 입력해주세요.');
            return;
        }

        if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            alert('관리자 암호가 일치하지 않습니다.');
            return;
        }

        if (!title.trim() || !distortion.trim() || !factSummary.trim() || !primarySource.trim()) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }

        setSubmitting(true);

        let generatedPdfUrl: string | null = editingFact?.pdf_url || null;
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
                    hashtags: hashtags,
                }),
            });
            const pdfData = await pdfRes.json();
            if (pdfData?.pdf_url) {
                generatedPdfUrl = pdfData.pdf_url;
            }
        } catch (e) {
            console.warn('PDF 보고서 연동 건너뜀:', e);
        }

        const cleanHashtags = hashtags
            .map((t) => String(t).replace(/^#/, '').trim())
            .filter(Boolean);

        const factPayload: any = {
            title: title.trim(),
            distortion: distortion.trim(),
            fact_summary: factSummary.trim(),
            primary_source: primarySource.trim(),
            source_url: sourceUrl.trim() || null,
            pdf_url: generatedPdfUrl,
            hashtags: cleanHashtags,
        };

        if (editingFact) {
            // [정정/수정 모드]
            let { data: updateData, error: updateError } = await supabase
                .from('facts')
                .update(factPayload)
                .eq('id', editingFact.id)
                .select();

            // 만약 hashtags 컬럼이 아직 DB에 없을 때 fallback 재시도
            if (updateError && updateError.message && updateError.message.includes('hashtags')) {
                console.warn('DB에 hashtags 컬럼 미존재 감지, hashtags 제외 후 재시도');
                delete factPayload.hashtags;
                const retry = await supabase
                    .from('facts')
                    .update(factPayload)
                    .eq('id', editingFact.id)
                    .select();
                updateData = retry.data;
                updateError = retry.error;
            }

            setSubmitting(false);

            if (updateError) {
                alert('팩트 리포트 정정 실패: ' + updateError.message);
                return;
            }

            if (!updateData || updateData.length === 0) {
                alert(
                    '⚠️ 팩트 리포트 수정이 DB에 반영되지 않았습니다.\n\n' +
                    '[원인]\nSupabase 데이터베이스의 Row Level Security (RLS) 정책에서 "facts" 테이블의 UPDATE 권한이 허용되어 있지 않습니다.\n\n' +
                    '[해결 방법]\nSupabase 대시보드 -> SQL Editor 에서 schema_hashtags.sql 파일의 UPDATE 정책 쿼리를 실행해 주시면 즉시 정상 작동합니다.'
                );
                return;
            }

            alert('팩트 리포트가 성공적으로 수정되었습니다.');
            onSuccess({ ...updateData[0], hashtags: cleanHashtags }, true);
            onClose();
        } else {
            // [신규 발행 모드]
            factPayload.request_id = selectedReqId ? selectedReqId : null;

            let { data: insertData, error: insertError } = await supabase
                .from('facts')
                .insert([factPayload])
                .select();

            // 만약 hashtags 컬럼이 아직 DB에 없을 때 fallback 재시도
            if (insertError && insertError.message && insertError.message.includes('hashtags')) {
                console.warn('DB에 hashtags 컬럼 미존재 감지, hashtags 제외 후 재시도');
                delete factPayload.hashtags;
                const retry = await supabase
                    .from('facts')
                    .insert([factPayload])
                    .select();
                insertData = retry.data;
                insertError = retry.error;
            }

            setSubmitting(false);

            if (insertError) {
                alert('팩트 리포트 저장 실패: ' + insertError.message);
                return;
            }

            if (insertData && insertData.length > 0) {
                alert('새 팩트 리포트가 성공적으로 발행되었습니다.');
                onSuccess({ ...insertData[0], hashtags: cleanHashtags }, false);
                onClose();
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto">
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 md:p-7 max-w-3xl w-full my-6 shadow-2xl">

                {/* 상단 헤더 영역 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-700/80 mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>{editingFact ? '✏️' : '⚙️'}</span>
                            <span>{editingFact ? '팩트 리포트 내용 정정 (수정)' : '팩트 리포트 발행 (관리자)'}</span>
                        </h3>
                        <p className="text-neutral-400 text-xs mt-0.5">
                            {editingFact
                                ? '기존에 발행된 팩트 리포트의 내용과 AI 팩트 체크 근거를 정정합니다.'
                                : '시민 의혹을 선택하고 AI 팩트 체크 근거 기반 교차검증 리포트를 작성합니다.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* PDF 보고서 다운로드/인쇄 버튼 */}
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-semibold rounded-md flex items-center gap-1.5 transition border border-neutral-600 cursor-pointer"
                            title="A4 규격의 인쇄용 PDF 보고서 출력"
                        >
                            <span>📄</span>
                            <span>PDF 보고서</span>
                        </button>

                        {/* AI 초안 생성 버튼 */}
                        <button
                            type="button"
                            onClick={handleGenerateAI}
                            disabled={generatingAI || summarizingEvidence || !title.trim()}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition shadow cursor-pointer"
                        >
                            <span>{generatingAI || summarizingEvidence ? '⏳' : '🤖'}</span>
                            <span>{generatingAI ? '왜곡 쟁점 분석 중...' : summarizingEvidence ? 'AI 팩트 체크 분석 중...' : 'AI 초안 생성'}</span>
                        </button>
                        <span className="text-xs bg-neutral-700/80 text-neutral-300 px-2 py-1.5 rounded border border-neutral-600">
                            검증팀
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {!editingFact && (
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
                    )}

                    <div>
                        <label className="block font-medium text-neutral-300 mb-1">리포트 제목 *</label>
                        <input
                            type="text"
                            required
                            placeholder="예: '○○ 정책 집행률 0% 주장' 사실관계 검증"
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
                                placeholder="예: 제기된 의혹의 핵심 요지 및 사실과 다른 과장·왜곡 프레임"
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
                                placeholder="예: 공문서, 통계 데이터, 일시·행위 대조를 통해 확인된 객관적 사실 및 검증 결론"
                                value={factSummary}
                                onChange={(e) => setFactSummary(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white leading-relaxed focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                            />
                        </div>
                    </div>

                    {/* AI 팩트 체크 영역 */}
                    <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                            <label className="font-semibold text-neutral-200 flex items-center gap-1.5">
                                <span>🏛️</span> AI 팩트 체크 (근거 자료 및 분석) *
                            </label>
                            <button
                                type="button"
                                onClick={handleSummarizeEvidence}
                                disabled={summarizingEvidence || !primarySource.trim()}
                                className="self-start sm:self-auto px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-[11px] font-bold rounded shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title="입력된 AI 팩트 체크 근거를 분석하여 [확인된 핵심 사실]과 [해시태그 5개]를 자동 생성합니다"
                            >
                                <span>{summarizingEvidence ? '⏳' : '✨'}</span>
                                <span>{summarizingEvidence ? 'AI 팩트 체크 분석 중...' : 'AI 팩트 체크 기반 핵심 사실 요약 생성'}</span>
                            </button>
                        </div>
                        <textarea
                            required
                            rows={4}
                            placeholder="예: 법원 판결문 원문, 법령 조항, 공공기관 답변서, 국가통계 원천 수치 등 실제 교차검증 근거를 입력하세요. 입력 후 위의 [✨ AI 팩트 체크 기반 핵심 사실 요약 생성] 버튼을 누르면 사실 요약과 해시태그 5개가 완성됩니다."
                            value={primarySource}
                            onChange={(e) => setPrimarySource(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-md p-2.5 text-white leading-relaxed focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                        />

                        {/* 요약 생성 버튼 바로 밑: 해시태그 표시 및 편집 영역 */}
                        <div className="bg-neutral-900/90 border border-neutral-700/80 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1">
                                    <span>🏷️</span> 핵심 해시태그 (요약 생성 시 자동 5개 추출)
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                    {hashtags.length}개 등록됨
                                </span>
                            </div>

                            {/* 태그 칩 목록 */}
                            <div className="flex flex-wrap items-center gap-1.5 min-h-[28px]">
                                {hashtags.length === 0 ? (
                                    <span className="text-[11px] text-neutral-500 italic">
                                        아직 추출된 해시태그가 없습니다. 위 [AI 팩트 체크 기반 핵심 사실 요약 생성] 버튼을 누르면 자동으로 5개가 생성됩니다.
                                    </span>
                                ) : (
                                    hashtags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 bg-neutral-800 text-emerald-400 border border-emerald-800/60 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs"
                                        >
                                            <span>#{tag}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="text-neutral-400 hover:text-red-400 text-xs ml-0.5 leading-none cursor-pointer"
                                                title="태그 삭제"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))
                                )}
                            </div>

                            {/* 직접 태그 추가 인풋 */}
                            <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                                <input
                                    type="text"
                                    placeholder="#키워드 직접 입력"
                                    value={customTagInput}
                                    onChange={(e) => setCustomTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCustomTag();
                                        }
                                    }}
                                    className="bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 flex-1 sm:w-48 sm:flex-initial"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCustomTag}
                                    className="px-2.5 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs rounded font-medium transition cursor-pointer"
                                >
                                    + 추가
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-700/80">
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                            관리자 암호 *
                        </label>
                        <input
                            type="password"
                            placeholder="관리자 암호를 입력하세요"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md font-medium transition cursor-pointer"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white font-semibold rounded-md transition shadow cursor-pointer"
                        >
                            {submitting
                                ? '저장 중...'
                                : editingFact
                                    ? '정정 내용 저장하기'
                                    : '팩트 리포트 발행하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}