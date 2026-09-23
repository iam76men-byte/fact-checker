'use client';

import React from 'react';

interface MarkdownViewerProps {
    content: string;
    className?: string;
}

export default function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
    if (!content || !content.trim()) {
        return <div className="text-neutral-500 italic text-xs">내용이 없습니다.</div>;
    }

    // 마크다운 파서 및 렌더러
    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // 1. 코드 블록 (``` ... ```)
            if (line.trim().startsWith('```')) {
                const lang = line.trim().replace(/^```/, '').trim();
                const codeLines: string[] = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                elements.push(
                    <div key={`code-${i}`} className="my-2.5 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-950 font-mono text-xs shadow-inner">
                        {lang && (
                            <div className="bg-neutral-800/80 px-3 py-1 text-[10px] text-neutral-400 font-semibold tracking-wider uppercase border-b border-neutral-700/60">
                                {lang}
                            </div>
                        )}
                        <pre className="p-3 text-neutral-200 overflow-x-auto leading-relaxed">
                            <code>{codeLines.join('\n')}</code>
                        </pre>
                    </div>
                );
                i++;
                continue;
            }

            // 2. 인용문 (> ...)
            if (line.trim().startsWith('>')) {
                const quoteLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith('>')) {
                    quoteLines.push(lines[i].replace(/^>\s?/, ''));
                    i++;
                }
                elements.push(
                    <blockquote
                        key={`quote-${i}`}
                        className="my-2.5 pl-3.5 py-1.5 border-l-4 border-blue-500 bg-blue-950/20 text-neutral-300 italic rounded-r text-xs sm:text-[13px] leading-relaxed"
                    >
                        {quoteLines.map((ql, qIdx) => (
                            <div key={qIdx}>{renderInline(ql)}</div>
                        ))}
                    </blockquote>
                );
                continue;
            }

            // 3. 수평선 (--- 또는 ***)
            if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
                elements.push(<hr key={`hr-${i}`} className="my-3 border-neutral-700/70" />);
                i++;
                continue;
            }

            // 4. 헤더 (#, ##, ###, ####)
            const h1Match = line.match(/^#\s+(.+)$/);
            if (h1Match) {
                elements.push(
                    <h1 key={`h1-${i}`} className="text-base sm:text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-neutral-700 flex items-center gap-1.5">
                        <span className="text-blue-400">#</span> {renderInline(h1Match[1])}
                    </h1>
                );
                i++;
                continue;
            }

            const h2Match = line.match(/^##\s+(.+)$/);
            if (h2Match) {
                elements.push(
                    <h2 key={`h2-${i}`} className="text-sm sm:text-base font-bold text-blue-200 mt-3.5 mb-1.5 pb-1 border-b border-neutral-800 flex items-center gap-1.5">
                        <span className="text-blue-500">##</span> {renderInline(h2Match[1])}
                    </h2>
                );
                i++;
                continue;
            }

            const h3Match = line.match(/^###\s+(.+)$/);
            if (h3Match) {
                elements.push(
                    <h3 key={`h3-${i}`} className="text-xs sm:text-sm font-bold text-neutral-100 mt-3 mb-1">
                        {renderInline(h3Match[1])}
                    </h3>
                );
                i++;
                continue;
            }

            const h4Match = line.match(/^####\s+(.+)$/);
            if (h4Match) {
                elements.push(
                    <h4 key={`h4-${i}`} className="text-xs font-semibold text-neutral-300 mt-2 mb-1">
                        {renderInline(h4Match[1])}
                    </h4>
                );
                i++;
                continue;
            }

            // 5. 테이블 (| 컬럼 | 컬럼 |)
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                const tableLines: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                    tableLines.push(lines[i].trim());
                    i++;
                }

                if (tableLines.length >= 2) {
                    const headerCells = tableLines[0].slice(1, -1).split('|').map(c => c.trim());
                    const bodyRows = tableLines.slice(2).map(r => r.slice(1, -1).split('|').map(c => c.trim()));

                    elements.push(
                        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-neutral-700 shadow-xs">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-neutral-800 text-neutral-200 border-b border-neutral-700">
                                        {headerCells.map((h, cIdx) => (
                                            <th key={cIdx} className="px-3 py-2 font-bold">{renderInline(h)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {bodyRows.map((row, rIdx) => (
                                        <tr key={rIdx} className="border-b border-neutral-800/80 hover:bg-neutral-800/40 transition">
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-3 py-2 text-neutral-300">{renderInline(cell)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                    continue;
                }
            }

            // 6. 글머리 기호 목록 (-, *, •)
            if (/^\s*[-*•]\s+/.test(line)) {
                const listItems: { indent: number; text: string }[] = [];
                while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
                    const match = lines[i].match(/^(\s*)([-*•])\s+(.+)$/);
                    if (match) {
                        listItems.push({
                            indent: Math.floor(match[1].length / 2),
                            text: match[3],
                        });
                    }
                    i++;
                }
                elements.push(
                    <ul key={`ul-${i}`} className="my-2 space-y-1 text-neutral-200 text-xs sm:text-[13px] leading-relaxed">
                        {listItems.map((item, idx) => (
                            <li
                                key={idx}
                                style={{ marginLeft: `${item.indent * 16}px` }}
                                className="flex items-start gap-2"
                            >
                                <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                                <span className="flex-1">{renderInline(item.text)}</span>
                            </li>
                        ))}
                    </ul>
                );
                continue;
            }

            // 7. 번호 목록 (1. , 2. )
            if (/^\s*\d+\.\s+/.test(line)) {
                const listItems: { num: string; text: string }[] = [];
                while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                    const match = lines[i].match(/^\s*(\d+)\.\s+(.+)$/);
                    if (match) {
                        listItems.push({ num: match[1], text: match[2] });
                    }
                    i++;
                }
                elements.push(
                    <ol key={`ol-${i}`} className="my-2 space-y-1 text-neutral-200 text-xs sm:text-[13px] leading-relaxed">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="text-emerald-400 font-bold font-mono shrink-0 text-xs bg-emerald-950/60 border border-emerald-800/60 rounded px-1.5 py-0.5 mt-0.5">
                                    {item.num}
                                </span>
                                <span className="flex-1 pt-0.5">{renderInline(item.text)}</span>
                            </li>
                        ))}
                    </ol>
                );
                continue;
            }

            // 8. 빈 줄
            if (!line.trim()) {
                elements.push(<div key={`empty-${i}`} className="h-2" />);
                i++;
                continue;
            }

            // 9. 일반 문단
            elements.push(
                <p key={`p-${i}`} className="my-1.5 text-neutral-200 text-xs sm:text-[13px] leading-relaxed">
                    {renderInline(line)}
                </p>
            );
            i++;
        }

        return elements;
    };

    // 인라인 마크다운 파서: **볼드**, *이탤릭*, `코드`, [링크](url)
    const renderInline = (text: string): React.ReactNode => {
        if (!text) return null;

        // 링크, 볼드, 코드, 이탤릭 정규식 분할
        // 토큰화: `code` | **bold** | *italic* | [text](url)
        const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (!part) return null;

            // 인라인 코드: `code`
            if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
                return (
                    <code
                        key={index}
                        className="bg-neutral-900 text-amber-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-neutral-700/80 mx-0.5"
                    >
                        {part.slice(1, -1)}
                    </code>
                );
            }

            // 볼드: **text**
            if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return (
                    <strong key={index} className="font-bold text-white text-inherit tracking-tight">
                        {part.slice(2, -2)}
                    </strong>
                );
            }

            // 이탤릭: *text*
            if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                return (
                    <em key={index} className="italic text-neutral-300">
                        {part.slice(1, -1)}
                    </em>
                );
            }

            // 링크: [text](url)
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return (
                    <a
                        key={index}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline font-medium break-all"
                    >
                        {linkMatch[1]}
                    </a>
                );
            }

            return <React.Fragment key={index}>{part}</React.Fragment>;
        });
    };

    return <div className={`markdown-body ${className}`}>{renderMarkdown(content)}</div>;
}

// PDF 출력 및 정적 HTML용 간단한 마크다운 -> HTML 변환기
export function markdownToHtml(md: string): string {
    if (!md) return '';
    return md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // 헤더
        .replace(/^#\s+(.+)$/gm, '<h2 style="font-size: 13pt; font-weight: bold; margin: 12px 0 6px; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">$1</h2>')
        .replace(/^##\s+(.+)$/gm, '<h3 style="font-size: 11pt; font-weight: bold; margin: 10px 0 4px; color: #334155;">$1</h3>')
        .replace(/^###\s+(.+)$/gm, '<h4 style="font-size: 10pt; font-weight: bold; margin: 8px 0 4px; color: #475569;">$1</h4>')
        // 볼드 및 이탤릭
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // 인라인 코드
        .replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 9pt;">$1</code>')
        // 인용구
        .replace(/^&gt;\s+(.+)$/gm, '<blockquote style="border-left: 3px solid #3b82f6; padding-left: 10px; margin: 6px 0; color: #475569; font-style: italic;">$1</blockquote>')
        // 목록
        .replace(/^\s*[-*•]\s+(.+)$/gm, '<li style="margin-left: 15px; margin-bottom: 3px;">$1</li>')
        .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li style="margin-left: 15px; margin-bottom: 3px; list-style-type: decimal;">$2</li>')
        // 줄바꿈
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
}
