'use client';

import { useState, useRef } from 'react';
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setUploading(true);
        let uploadedImageUrl: string | null = null;

        // 1. 사용자가 수동으로 파일을 직접 첨부한 경우
        if (selectedFile) {
            setUploadStatus('첨부 이미지 업로드 중...');
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('fact_images')
                .upload(filePath, selectedFile);

            if (uploadError) {
                alert('이미지 업로드 실패: ' + uploadError.message);
                setUploading(false);
                setUploadStatus('');
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('fact_images')
                .getPublicUrl(filePath);

            uploadedImageUrl = publicUrlData.publicUrl;
        } 
        // 2. 수동 첨부 파일이 없지만 기사 URL이 입력된 경우 -> 자동 화면 캡처 실행!
        else if (newUrl.trim()) {
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
            setSelectedFile(null);
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
                        <p className="text-[11px] text-neutral-400 mt-1">
                            💡 기사 링크를 입력하시면 <strong className="text-neutral-300">실제 뉴스 화면이 자동으로 캡처</strong>되어 증거로 영구 보존됩니다.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                            캡처 이미지 직접 첨부 (선택)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setSelectedFile(e.target.files[0]);
                                    }
                                }}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-medium rounded border border-neutral-600 transition"
                            >
                                📁 파일 선택
                            </label>
                            <span className="text-xs text-neutral-400 truncate max-w-[200px]">
                                {selectedFile ? selectedFile.name : '선택된 파일 없음'}
                            </span>
                            {selectedFile && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="text-xs text-red-400 hover:underline"
                                >
                                    삭제
                                </button>
                            )}
                        </div>
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
                                setSelectedFile(null);
                            }}
                            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs rounded"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
                        >
                            {uploading ? '처리 중...' : '등록하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}