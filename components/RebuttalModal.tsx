'use client';

import { useState, useEffect, useRef } from 'react';

export interface FactItemForRebuttal {
    id: number;
    title: string;
    fact_summary?: string;
    distortion?: string;
}

export interface RebuttalItem {
    id: number;
    fact_id: number;
    fact_title: string;
    fact_verdict: string;
    author_name: string;
    title: string;
    content: string;
    reference_file_url?: string | null;
    reference_file_name?: string | null;
    reference_file_size?: number | null;
    created_at: string;
    updated_at?: string;
}

interface RebuttalModalProps {
    isOpen: boolean;
    facts: FactItemForRebuttal[];
    initialFactId?: number | null;
    editingItem?: RebuttalItem | null;
    defaultAuthorName?: string;
    onClose: () => void;
    onSuccess: (item: RebuttalItem, isEdit: boolean) => void;
}

export default function RebuttalModal({
    isOpen,
    facts,
    initialFactId,
    editingItem,
    defaultAuthorName,
    onClose,
    onSuccess,
}: RebuttalModalProps) {
    const [selectedFactId, setSelectedFactId] = useState<number | string>('');
    const [title, setTitle] = useState('');
    const [authorName, setAuthorName] = useState('시민/당사자');
    const [content, setContent] = useState('');
    const [password, setPassword] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 선택된 팩트 정보 추출
    const currentFact = facts.find((f) => f.id === Number(selectedFactId));

    // 판정 결론 텍스트 파싱 헬퍼
    const extractVerdict = (summary?: string) => {
        if (!summary) return '검증 완료';
        const match = summary.match(/\[(.*?)\]/);
        return match ? match[1] : '검증 안건';
    };

    const verdictText = currentFact ? extractVerdict(currentFact.fact_summary) : '';

    // 판정 결론 색상 헬퍼
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

    useEffect(() => {
        if (editingItem) {
            setSelectedFactId(editingItem.fact_id);
            setTitle(editingItem.title);
            setAuthorName(editingItem.author_name);
            setContent(editingItem.content);
            setPassword('');
            setSelectedFile(null);
            setFileError('');
        } else {
            setSelectedFactId(initialFactId || (facts.length > 0 ? facts[0].id : ''));
            setTitle('');
            setAuthorName(defaultAuthorName || '시민/당사자');
            setContent('');
            setPassword('');
            setSelectedFile(null);
            setFileError('');
        }
    }, [isOpen, editingItem, initialFactId, facts, defaultAuthorName]);

    if (!isOpen) return null;

    // 파일 선택 핸들러 (200KB 용량 제한 검증)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError('');
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const MAX_SIZE = 200 * 1024; // 200KB
            if (file.size > MAX_SIZE) {
                setFileError(`파일 크기는 200KB 이하여야 합니다. (선택한 파일: ${(file.size / 1024).toFixed(1)}KB)`);
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFactId) {
            alert('반론을 제기할 대상 팩트 안건을 선택해주세요.');
            return;
        }
        if (!title.trim() || !content.trim() || !password.trim()) {
            alert('제목, 내용, 비밀번호를 모두 입력해주세요.');
            return;
        }
        if (content.length > 2000) {
            alert('반론 내용은 최대 2,000자까지 작성할 수 있습니다.');
            return;
        }

        setSubmitting(true);

        try {
            if (editingItem) {
                // 수정 모드 (PUT)
                const res = await fetch('/api/rebuttals', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingItem.id,
                        password: password.trim(),
                        title: title.trim(),
                        content: content.trim(),
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '수정 실패');

                onSuccess(data.rebuttal, true);
                onClose();
            } else {
                // 신규 등록 모드 (POST FormData)
                const formData = new FormData();
                formData.append('fact_id', String(selectedFactId));
                formData.append('fact_title', currentFact?.title || '팩트 안건');
                formData.append('fact_verdict', verdictText || '검증 완료');
                formData.append('author_name', authorName.trim() || '시민/당사자');
                formData.append('title', title.trim());
                formData.append('content', content.trim());
                formData.append('password', password.trim());
                if (selectedFile) {
                    formData.append('reference_file', selectedFile);
                }

                const res = await fetch('/api/rebuttals', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '등록 실패');

                onSuccess(data.rebuttal, false);
                onClose();
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto">
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 md:p-7 max-w-2xl w-full my-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-700 mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>⚖️</span>
                            <span>{editingItem ? '반론 내용 정정(수정)' : '시민·당사자 공식 반론 제기'}</span>
                        </h3>
                        <p className="text-neutral-400 text-xs mt-0.5">
                            검증 판정 결과에 대한 반론 사유와 객관적 근거 자료를 등록합니다.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white text-xl leading-none cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {/* 1. 대상 팩트 선택 */}
                    {!editingItem ? (
                        <div>
                            <label className="block font-semibold text-neutral-200 mb-1.5">
                                📌 반론 대상 팩트 안건 선택 *
                            </label>
                            <select
                                value={selectedFactId}
                                onChange={(e) => setSelectedFactId(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 text-xs"
                                required
                            >
                                <option value="">-- 반론을 펼 안건을 선택하세요 --</option>
                                {facts.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {/* 2. 선택된 팩트의 제목 및 판정 결론 미리보기 카드 */}
                    {currentFact && (
                        <div className="bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-3.5 space-y-2">
                            <div className="text-[11px] text-neutral-400 font-semibold flex items-center justify-between">
                                <span>🎯 검증 대상 안건 정보</span>
                                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getVerdictBadgeStyle(verdictText)}`}>
                                    {verdictText}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-neutral-100 leading-snug">
                                {currentFact.title}
                            </h4>
                            {currentFact.fact_summary && (
                                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed bg-neutral-950/60 p-2 rounded border border-neutral-800">
                                    {currentFact.fact_summary.replace(/검증 판정 결론:.*?\s*/g, '')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* 3. 작성자명 & 반론 제목 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                            <label className="block font-medium text-neutral-300 mb-1">
                                작성자 / 소속
                            </label>
                            <input
                                type="text"
                                placeholder="시민, 당사자, 관계자 등"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-red-500"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block font-medium text-neutral-300 mb-1">
                                반론 요약 제목 *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="예: '○○ 보도 관련 공식 정정보도 및 객관적 소명자료 제출'"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-red-500"
                            />
                        </div>
                    </div>

                    {/* 4. 반론 내용 (최대 2,000자 실시간 카운터) */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-neutral-200">
                                📝 반론 내용 (최대 2,000자) *
                            </label>
                            <span className={`text-[11px] font-mono ${content.length >= 2000 ? 'text-red-400 font-bold' : content.length > 1800 ? 'text-amber-400' : 'text-neutral-400'}`}>
                                {content.length.toLocaleString()} / 2,000자
                            </span>
                        </div>
                        <textarea
                            required
                            rows={8}
                            maxLength={2000}
                            placeholder="기존 검증 판정의 사실관계 오류, 누락된 맥락, 추가 소명 사유를 구체적이고 객관적인 사실에 입각하여 작성해주세요. (최대 2,000자)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white leading-relaxed focus:outline-none focus:border-red-500 font-sans text-xs"
                        />
                    </div>

                    {/* 5. 참고문헌 첨부 파일 (신규 작성 시에만, 최대 1개 200KB 이하) */}
                    {!editingItem && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="font-medium text-neutral-300">
                                    📎 참고 문헌 / 소명 증빙 파일 첨부 (선택, 1개)
                                </label>
                                <span className="text-[11px] text-neutral-400">
                                    최대 용량 <strong>200KB</strong>
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="rebuttal-file-upload"
                                />
                                <label
                                    htmlFor="rebuttal-file-upload"
                                    className="cursor-pointer px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-600 transition"
                                >
                                    📁 파일 선택
                                </label>
                                <span className="text-xs text-neutral-400 truncate max-w-[280px]">
                                    {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)}KB)` : '선택된 파일 없음'}
                                </span>
                                {selectedFile && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setFileError('');
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="text-xs text-red-400 hover:underline cursor-pointer"
                                    >
                                        삭제
                                    </button>
                                )}
                            </div>
                            {fileError && (
                                <p className="text-xs text-red-400 mt-1 font-medium">{fileError}</p>
                            )}
                            <p className="text-[11px] text-neutral-500 mt-1">
                                공문서 사본, 판결문, 통계 데이터, 성명서 PDF/이미지 등 (200KB 이하)
                            </p>
                        </div>
                    )}

                    {/* 6. 비밀번호 입력 (정정/삭제용) */}
                    <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-700/60">
                        <label className="block font-semibold text-neutral-200 mb-1">
                            🔒 {editingItem ? '작성 시 설정한 비밀번호 확인 *' : '게시물 비밀번호 설정 (정정 및 삭제 시 사용) *'}
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="4자리 이상 입력 (예: 1234)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full sm:w-64 bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-red-500"
                        />
                        <p className="text-[11px] text-neutral-400 mt-1">
                            본 비밀번호가 일치하는 작성자 본인만 추후 내용을 정정하거나 삭제(비공개 처리)할 수 있습니다.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-700">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !!fileError}
                            className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>{submitting ? '처리 중...' : editingItem ? '정정(수정) 완료' : '반론 등록하기'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
