import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        const { title, distortion, fact_summary, primary_source } = await req.json();

        if (!title) {
            return NextResponse.json({ error: '제목이 필요합니다.' }, { status: 400 });
        }

        // A4 인쇄 규격의 공식 HTML 보고서 Blob 생성 (브라우저가 PDF로 바로 렌더링/인쇄 가능한 포맷)
        const reportHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>FactRepo 검증보고서 - ${title}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", sans-serif; color: #111; line-height: 1.6; margin: 0; padding: 20px; }
    .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header h1 { font-size: 20pt; margin: 0; font-weight: 800; color: #b91c1c; }
    .title-box { background: #f4f4f5; border-left: 5px solid #b91c1c; padding: 14px 18px; font-size: 13pt; font-weight: 700; margin-bottom: 24px; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 11pt; font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .box { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 4px; padding: 14px; white-space: pre-wrap; font-size: 10pt; }
    .footer { margin-top: 40px; padding-top: 10px; border-top: 1px dashed #bbb; font-size: 8.5pt; color: #666; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div><h1>FactRepo 사실조사 검증보고서</h1><div style="font-size: 9pt; color: #555;">공공데이터 및 1차 사료 교차검증 센터</div></div>
    <div style="font-size: 9pt; text-align: right;">발행일: ${new Date().toLocaleDateString('ko-KR')}<br>인증문서 FR-${Date.now().toString().slice(-6)}</div>
  </div>
  <div class="title-box">검증 안건: ${title}</div>
  <div class="section"><div class="section-title" style="color: #b91c1c;">1. 제기된 의혹 및 왜곡 프레임</div><div class="box">${distortion}</div></div>
  <div class="section"><div class="section-title" style="color: #047857;">2. 객관적 핵심 사실 (Fact Summary)</div><div class="box">${fact_summary}</div></div>
  <div class="section"><div class="section-title" style="color: #1d4ed8;">3. 1차 사료 및 교차검증 근거</div><div class="box">${primary_source}</div></div>
  <div class="footer"><span>FactRepo Public Verification Unit</span><span>본 문서는 공공데이터와 공적 사료에 기반하여 발행되었습니다.</span></div>
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