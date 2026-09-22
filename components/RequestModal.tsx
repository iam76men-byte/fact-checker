'use client';

import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RequestItem } from './RequestList';

interface RequestModalProps {
    isOpen: boolean;
    citizneID?: string;
    onClose: () => void;
    onSuccess: (newItem: RequestItem) => void;
}

export default function RequestModal({ isOpen, onClose, onSuccess }: RequestModalProps) {
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setUploading(true);
        let uploadedImageUrl: string | null = null;

        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('fact_images')
                .upload(filePath, selectedFile);

            if (uploadError) {
                alert('이미지 업로드 실패: ' + uploadError.message);
                setUploading(false);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('fact_images')
                .getPublicUrl(filePath);

            uploadedImageUrl = publicUrlData.publicUrl;
        }

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
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-base font-bold text-white mb-4">새 검증 의뢰 작성</h3>
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
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                            기사 URL (선택)
                        </label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-white focus:outline-none focus:border-red-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                            캡처 이미지 첨부 (선택)
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
                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-600 text-white text-xs font-semibold rounded flex items-center gap-1.5"
                        >
                            {uploading ? '업로드 및 저장 중...' : '등록하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}