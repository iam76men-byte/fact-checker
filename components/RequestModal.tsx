'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { RequestItem } from './RequestList';

interface RequestModalProps {
    isOpen: boolean;
    citizenId?: string;
    onClose: () => void;
    onSuccess: (newItem: RequestItem) => void;
}

export default function RequestModal({
    isOpen,
    citizenId,
    onClose,
    onSuccess,
}: RequestModalProps) {
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setUploading(true);
        let uploadedImageUrl: string | null = null;

        // 기사 URL이 입력된 경우 -> 실제 뉴스 화면 자동 캡처 및 영구 보존 실행
        if (newUrl.trim()) {
            setUploadStatus('📸 기사 화면을 자동 캡처하여 증거 보존 중...');
            try {
                const captureRes = await fetch('/api/capture-screenshot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: newUrl.trim() }),
                });

                if (captureRes.ok) {
                    const captureData = await captureRes.json();
                    if (captureData.imageUrl) {
                        uploadedImageUrl = captureData.imageUrl;
                    }
                } else {
                    console.warn('Screenshot capture failed, continuing without image');
                }
            } catch (captureErr) {
                console.warn('Auto capture error:', captureErr);
            }
        }

        setUploadStatus('검증 의뢰 등록 중...');

        const { data, error } = await supabase
            .from('requests')
            .insert([
                {
                    title: newTitle.trim(),
                    source_url: newUrl.trim() || null,
                    image_url: uploadedImageUrl,
                    upvotes: 1,
                    downvotes: 0,
                },
            ])
            .select();

        setUploading(false);
        setUploadStatus('');

        if (error) {
            alert('DB 저장 실패: ' + error.message);
            return;
        }

        if (data && data.length > 0) {
            onSuccess(data[0]);
            setNewTitle('');
            setNewUrl('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <span>📢</span>
                    <span>새 검증 의뢰 작성</span>
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                            의혹 내용 / 한 줄 요약 *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="예: ○○일보 '후보자 개입' 기사 팩트 확인 요청"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:outline-none focus:border-red-500"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-neutral-300">
                                기사 URL (선택)
                            </label>
                            <span className="text-[11px] text-red-400 font-medium">
                                📸 자동 캡처 지원
                            </span>
                        </div>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:outline-none focus:border-red-500"
                        />
                        <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                            💡 기사 링크를 입력하시면 <strong className="text-neutral-300">실제 뉴스 화면이 자동으로 캡처</strong>되어 증거로 영구 보존됩니다.
                        </p>
                    </div>

                    {uploading && uploadStatus && (
                        <div className="bg-red-950/40 border border-red-900/60 rounded p-2.5 text-xs text-red-300 flex items-center gap-2 animate-pulse">
                            <span className="inline-block animate-spin">⏳</span>
                            <span>{uploadStatus}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => {
                                onClose();
                            }}
                            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs rounded transition cursor-pointer"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition cursor-pointer"
                        >
                            {uploading ? '처리 중...' : '등록하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}