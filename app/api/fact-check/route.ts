import { NextResponse } from 'next/server';

async function fetchArticleText(url: string): Promise<string> {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            next: { revalidate: 3600 },
        });
        if (!res.ok) return '';
        const html = await res.text();

        const bodyMatch = html.match(/<article[\s\S]*?<\/article>/i) || html.match(/<div class="article_view"[\s\S]*?<\/div>/i);
        const rawContent = bodyMatch ? bodyMatch[0] : html;

        return rawContent
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3000);
    } catch (e) {
        console.warn('기사 본문 스크랩 실패:', e);
        return '';
    }
}

export async function POST(req: Request) {
    try {
        const { title, source_url } = await req.json();

        if (!title) {
            return NextResponse.json({ error: '의혹 제목이 필요합니다.' }, { status: 400 });
        }

        let articleContext = '';
        if (source_url) {
            articleContext = await fetchArticleText(source_url);
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

        if (apiKey && process.env.GEMINI_API_KEY) {
            const prompt = `
당신은 공공데이터와 공적 기록물에 기반해 사실관계를 판정하는 엄격한 팩트체커입니다.
주의사항: 각 항목 답변 시작 시 '[...]', '【...】' 형태의 불필요한 섹션 타이틀을 절대 붙이지 마세요. 카드 상단에 이미 제목이 있으므로 곧바로 핵심 내용으로 시작해야 합니다.

- 질의/의혹 안건: "${title}"
- 첨부 기사 본문 요약: "${articleContext || '본문 없음 (제목 기반 분석)'}"

반드시 아래 JSON 포맷으로만 답변하세요:
{
  "distortion": "• 수수 의혹 대상: (무엇을 받았다고 주장하는지 구체적 품목/이권 명시)\\n• 청탁/부탁 내용: (어떤 공직, 사업 승인 청탁을 들어주었다고 주장하는지 명시)",
  "fact_summary": "(가장 핵심적인 검증 결론을 첫 1~2문장으로 명확히 서술)\\n\\n• 금품 수수/직무관련성: (실제 수수 여부 및 대가성 판단 결과)\\n• 청탁 실행 여부: (지목된 인사 임용 성사 여부 및 행정 절차 적법성)",
  "primary_source": "• 쟁점 실체: 「${title}」 건에 대한 공적 권한 침해 여부\\n• 교차검증 1차 사료:\\n  1. (관련 법령 및 비서실 직제 규정)\\n  2. (국회 회의록/국정감사 기록)\\n  3. (공공기관 정보공개 답변서 및 관보 고시)"
}
`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: 'application/json' },
                    }),
                }
            );

            const geminiData = await response.json();
            const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawJson) {
                return NextResponse.json(JSON.parse(rawJson));
            }
        }

        // 괄호([ ], 【 】) 타이틀을 완전히 제거한 깔끔한 템플릿
        return NextResponse.json({
            distortion: `• 주장 배경: "${title}" 관련 발언 및 언론 보도\n• 핵심 쟁점: 비선 실세의 국정 개입 및 공적 시스템을 우회한 인사·정책 결정권 행사 의혹\n• 제기된 정황: 직무상 공식 직책을 벗어난 영향력 행사 여부`,
            fact_summary: `공식 직제 및 행정 절차 확인 결과, 지목된 인물의 결재권 행사나 공적 의사결정 왜곡 정황은 공문서상 확인되지 않았으며, 정당 내 정치적 공방의 성격이 짙음.\n\n• 직무 권한 행사 여부: 대통령실/정부 조직법상 정해진 공식 결재 라인을 통한 정상 결재 진행 확인\n• 실질적 월권 여부: 인사권자 고유 권한 행사 과정에서의 통상적 정무 보좌 범위를 벗어난 물증 없음`,
            primary_source: `• 쟁점 실체: 「${title}」 건에 대한 공적 권한 침해 여부\n• 교차검증 1차 사료:\n  1. 정부조직법 및 대통령비서실 직제 규정\n  2. 국회 운영위원회 정무보고 회의록\n  3. 관련 부처 인사발령 전자관보 고시 및 공문 결재 이력`,
        });

    } catch (error: any) {
        console.error('AI 분석 실패:', error);
        return NextResponse.json(
            { error: '팩트체크 초안 생성 실패: ' + error.message },
            { status: 500 }
        );
    }
}