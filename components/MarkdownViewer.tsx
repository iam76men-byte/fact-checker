'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';

// GFM (GitHub Flavored Markdown) 및 줄바꿈 허용 설정
marked.setOptions({
    gfm: true,
    breaks: true,
});

/**
 * 취소선/삭제표시(~~...~~, <del>...</del>, <s>...</s>, <strike>...</strike>)된 내용을
 * 본문에서 완전히 제외(제거)하는 함수
 */
export function removeDeletedContent(text: string): string {
    if (!text) return '';
    return text
        .replace(/~~[\s\S]*?~~/g, '')
        .replace(/<del\b[^>]*>[\s\S]*?<\/del>/gi, '')
        .replace(/<s\b[^>]*>[\s\S]*?<\/s>/gi, '')
        .replace(/<strike\b[^>]*>[\s\S]*?<\/strike>/gi, '');
}

/**
 * 한국어에서 기간/범위(예: 1997~1998, 20~40%, 2~3년)에 쓰인 단일 물결표(~)가
 * 마크다운 취소선으로 잘못 인식되는 것을 방지하기 위해 이스케이프
 */
export function normalizeTildes(text: string): string {
    if (!text) return '';
    const tildePlaceholders: string[] = [];
    let protectedText = text.replace(/~~([\s\S]*?)~~/g, (match) => {
        tildePlaceholders.push(match);
        return `___TILDE_STRIKE_${tildePlaceholders.length - 1}___`;
    });

    // 단일 물결표를 HTML 엔티티로 변환하여 취소선 파싱 방지
    protectedText = protectedText.replace(/~/g, '&#126;');

    // 이중 물결 취소선 복원
    protectedText = protectedText.replace(/___TILDE_STRIKE_(\d+)___/g, (_, idx) => {
        return tildePlaceholders[Number(idx)];
    });

    return protectedText;
}

/**
 * 테이블 중간에 빈 줄이 들어가거나, 긴 셀 내용이 여러 줄로 쪼개져 
 * 마크다운 파서가 테이블을 비정상 종료하는 현상을 방지하고, 삭제 표시 및 물결표를 정규화하는 전처리 함수
 */
export function preprocessMarkdown(text: string): string {
    if (!text) return '';

    // 1. 삭제표시(취소선) 내용 제외
    let processed = removeDeletedContent(text);

    // 2. 단일 물결표(범위 표시) 오작동 방지
    processed = normalizeTildes(processed);

    // 3. 테이블 구조 보정
    const lines = processed.split(/\r?\n/);
    const resultLines: string[] = [];
    let insideTable = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 테이블 행 검사 (| 시작 및 | 포함)
        const isTableLine = trimmed.startsWith('|') && (trimmed.endsWith('|') || trimmed.includes('|'));

        if (isTableLine) {
            insideTable = true;
            resultLines.push(line);
            continue;
        }

        // 테이블 내부인 상태에서 빈 줄을 만난 경우
        if (insideTable) {
            if (trimmed === '') {
                // 뒤따라오는 첫 번째 유효 행 검사
                let nextNonEmptyIndex = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() !== '') {
                        nextNonEmptyIndex = j;
                        break;
                    }
                }

                if (nextNonEmptyIndex !== -1) {
                    const nextLineTrimmed = lines[nextNonEmptyIndex].trim();
                    const isNextPartOfTable =
                        nextLineTrimmed.includes('|') ||
                        nextLineTrimmed.startsWith('<br>') ||
                        nextLineTrimmed.startsWith('•') ||
                        nextLineTrimmed.startsWith('-');
                    if (isNextPartOfTable) {
                        // 빈 줄은 무시하고 테이블 컨텍스트 유지
                        continue;
                    }
                }

                insideTable = false;
                resultLines.push(line);
                continue;
            }

            // 빈 줄은 아니지만 | 로 시작하지 않는 셀 연장 줄 (예: "<br>• 행정부 ... |")
            if (trimmed.endsWith('|') || (i + 1 < lines.length && lines[i + 1].trim().includes('|'))) {
                const prev = resultLines[resultLines.length - 1] || '';
                resultLines[resultLines.length - 1] = prev + ' ' + trimmed;
                continue;
            } else {
                insideTable = false;
                resultLines.push(line);
            }
        } else {
            resultLines.push(line);
        }
    }

    return resultLines.join('\n');
}

interface MarkdownViewerProps {
    content: string;
    className?: string;
}

export default function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
    const htmlContent = useMemo(() => {
        if (!content || !content.trim()) return '';
        try {
            const preprocessed = preprocessMarkdown(content);
            return marked.parse(preprocessed) as string;
        } catch (e) {
            console.warn('Markdown parsing error:', e);
            return content;
        }
    }, [content]);

    if (!content || !content.trim()) {
        return <div className="text-neutral-500 italic text-xs">내용이 없습니다.</div>;
    }

    return (
        <div
            className={`markdown-prose ${className}`}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
}

// PDF 출력 및 정적 HTML용 마크다운 -> HTML 변환 헬퍼
export function markdownToHtml(md: string): string {
    if (!md || !md.trim()) return '';
    try {
        const preprocessed = preprocessMarkdown(md);
        return marked.parse(preprocessed) as string;
    } catch {
        return md.replace(/\n/g, '<br>');
    }
}
