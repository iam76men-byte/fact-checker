import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { markdownToHtml } from '@/components/MarkdownViewer';

// Supabase 관리자/공용 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// PDF 표준 1.4 바이너리 인코더 (별도 무거운 라이브러리 없이 순수 서버 생성)
function buildSimplePdf(title: string, distortion: string, factSummary: string, primarySource: string): Uint8Array {
    // 한글 호환을 위해 Base64 UTF-8 텍스트 스트림과 표준 폰트 구조를 사용하는 간결한 PDF 빌더
    const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const contentText = `
%PDF-1.4
1 0 obj
<< /Title (${Buffer.from(title).toString('binary')}) /Creator (FactRepo Public Verification Unit) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595.28 841.89] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 16 Tf
50 780 Td
(FactRepo Verification Report) Tj
/F1 10 Tf
0 -25 Td
(Date: ${dateStr}) Tj
0 -25 Td
(Agenda: Check attached FactRepo card for full Korean transcripts) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000095 00000 n 
0000000146 00000 n 
0000000210 00000 n 
0000000370 00000 n 
0000000305 00000 n 
trailer
<< /Size 7 /Root 2 0 R /Info 1 0 R >>
startxref
500
%%EOF
`;
    return Buffer.from(contentText, 'binary');
}

export async function POST(req: Request) {
    try {
        const { title, distortion, fact_summary, primary_source, hashtags } = await req.json();

        if (!title) {
            return NextResponse.json({ error: '제목이 필요합니다.' }, { status: 400 });
        }

        const tagsHtml = Array.isArray(hashtags) && hashtags.length > 0
            ? `<div style="margin-top: 15px; font-size: 9pt; color: #4b5563;">
                 <strong>핵심 키워드 태그:</strong> ${hashtags.join(' ')}
               </div>`
            : '';

        // A4 인쇄 규격의 공식 HTML 보고서 Blob 생성 (브라우저가 PDF로 바로 렌더링/인쇄 가능한 포맷)
        const reportHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>FactRepo 검증보고서 - ${title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Malgun Gothic", sans-serif; color: #1e293b; line-height: 1.7; margin: 0; padding: 25px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header h1 { font-size: 19pt; margin: 0; font-weight: 800; color: #dc2626; letter-spacing: -0.5px; }
    .title-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #dc2626; padding: 14px 18px; font-size: 13pt; font-weight: 700; margin-bottom: 22px; border-radius: 0 6px 6px 0; color: #0f172a; }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section-title { font-size: 11pt; font-weight: 700; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; }
    .box { background: #fafafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; white-space: pre-wrap; font-size: 9.5pt; line-height: 1.75; color: #334155; }
    
    /* 마크다운 서식 전용 스타일 */
    .box-markdown { white-space: normal !important; word-break: break-word !important; }
    .box-markdown table { width: 100% !important; border-collapse: collapse !important; margin: 14px 0 !important; font-size: 9pt !important; border: 1.5px solid #cbd5e1 !important; }
    .box-markdown th { background: #f1f5f9 !important; font-weight: 700 !important; text-align: left !important; border: 1px solid #cbd5e1 !important; padding: 8px 12px !important; color: #0f172a !important; }
    .box-markdown td { border: 1px solid #cbd5e1 !important; padding: 8px 12px !important; background: #ffffff !important; color: #334155 !important; vertical-align: top !important; }
    .box-markdown tr:nth-child(even) td { background: #f8fafc !important; }
    .box-markdown h1, .box-markdown h2, .box-markdown h3, .box-markdown h4 { color: #0f172a !important; font-weight: 700 !important; margin: 12px 0 6px 0 !important; }
    .box-markdown h3 { font-size: 11pt !important; border-bottom: 1px solid #e2e8f0 !important; padding-bottom: 4px !important; }
    .box-markdown ul, .box-markdown ol { margin: 6px 0 !important; padding-left: 20px !important; }
    .box-markdown li { margin-bottom: 4px !important; color: #334155 !important; }
    .box-markdown strong { color: #0f172a !important; font-weight: 700 !important; }
    .box-markdown blockquote { border-left: 3.5px solid #2563eb !important; background: #eff6ff !important; padding: 8px 12px !important; margin: 8px 0 !important; color: #1e40af !important; }
    .box-markdown code { background: #f1f5f9 !important; padding: 2px 4px !important; border-radius: 4px !important; font-size: 8.5pt !important; }

    .footer { margin-top: 36px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 8.5pt; color: #64748b; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div><h1>FactRepo 사실조사 검증보고서</h1><div style="font-size: 9pt; color: #64748b; margin-top: 4px;">AI 팩트 체크 및 공공데이터 검증 센터</div></div>
    <div style="font-size: 8.5pt; text-align: right; color: #64748b;">발행일: ${new Date().toLocaleDateString('ko-KR')}<br>인증문서 FR-${Date.now().toString().slice(-6)}</div>
  </div>
  <div class="title-box">검증 안건: ${title}</div>
  <div class="section"><div class="section-title" style="color: #b91c1c;">1. 제기된 의혹 및 왜곡 프레임</div><div class="box" style="border-left: 4px solid #ef4444;">${distortion}</div></div>
  <div class="section"><div class="section-title" style="color: #047857;">2. 객관적 핵심 사실 (Fact Summary)</div><div class="box" style="border-left: 4px solid #10b981;">${fact_summary}</div></div>
  <div class="section"><div class="section-title" style="color: #1d4ed8;">3. AI 팩트 체크</div><div class="box box-markdown" style="border-left: 4px solid #3b82f6;">${markdownToHtml(primary_source)}</div>${tagsHtml}</div>
  <div class="footer"><span>FactRepo Public Verification Unit</span><span>본 문서는 시민 제보 및 공공데이터·공적 사료에 기반하여 발행되었습니다.</span></div>
</body>
</html>`;

        // Storage에 HTML 리포트(웹 보고서 형태)를 업로드
        const fileName = `report_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.html`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('fact_pdfs')
            .upload(filePath, Buffer.from(reportHtml, 'utf-8'), {
                contentType: 'text/html; charset=utf-8',
                upsert: true,
            });

        if (uploadError) {
            console.warn('Storage 업로드 경고:', uploadError.message);
            return NextResponse.json({ pdf_url: null });
        }

        const { data: publicUrlData } = supabase.storage
            .from('fact_pdfs')
            .getPublicUrl(filePath);

        return NextResponse.json({ pdf_url: publicUrlData.publicUrl });
    } catch (error: any) {
        console.error('PDF 보고서 생성 실패:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}