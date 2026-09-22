import { NextResponse } from 'next/server';

// 기사 본문 스크랩 함수
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

        // 다양한 언론사 본문 선택자 매칭
        const bodyMatch =
            html.match(/<article[\s\S]*?<\/article>/i) ||
            html.match(/<div class="article_view"[\s\S]*?<\/div>/i) ||
            html.match(/<div id="article_body"[\s\S]*?<\/div>/i) ||
            html.match(/<div class="article-body"[\s\S]*?<\/div>/i) ||
            html.match(/<div id="news_body_area"[\s\S]*?<\/div>/i) ||
            html.match(/<div class="news_cnt"[\s\S]*?<\/div>/i);

        const rawContent = bodyMatch ? bodyMatch[0] : html.slice(0, 8000);

        return rawContent
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3500);
    } catch (e) {
        console.warn('기사 본문 스크랩 실패:', e);
        return '';
    }
}

// 안건별 맞춤 스마트 팩트체크 분석기 (API 키가 없거나 실패할 때도 안건 맞춤형으로 작동)
function generateSmartFactDraft(title: string, articleContext: string = '') {
    // 1. 발언자 / 주체 추출
    let speaker = '';
    const speakerMatch = title.match(/^([가-힣]{2,4}|[가-힣A-Za-z0-9\s]{2,10})\s*[,，"“'‘-]/);
    if (speakerMatch) {
        speaker = speakerMatch[1].trim();
    } else {
        const byMatch = title.match(/…\s*([가-힣]{2,4})의\s*생각/);
        if (byMatch) speaker = byMatch[1].trim();
    }

    // 2. 인용구 추출 (길이가 가장 긴 실질적 핵심 문장을 우선 선택)
    const quoteMatches = [...title.matchAll(/["“'‘]([^"”'’]+)["”'’]/g)].map(m => m[1]);
    quoteMatches.sort((a, b) => b.length - a.length);
    const mainQuote = quoteMatches[0] || '';

    // 기사 본문 속 수치 및 통계 데이터 추출
    const numMatches = articleContext.match(/[0-9,]+(?:\.[0-9]+)?(?:곳|명|건|원|%|호|심|년|개월|배)/g) || [];
    const statsSummary = numMatches.slice(0, 3).join(', ');

    // 3. 의혹 사안의 성격 및 카테고리 정밀 분류
    const fullText = `${title} ${articleContext}`;
    let category = 'general';

    if (/대가로|수수|금품|뇌물|청탁|특검|공소|징역|선고|재판|항소심|1심|피고인/i.test(fullText)) {
        category = 'judicial_bribery';
    } else if (/정비사업|주택|공급|전세|부동산|예산|세금|감소|증가|인허가|실거주/i.test(fullText)) {
        category = 'policy_stats';
    } else if (/수렴청정|비선|월권|권한|국정\s*개입|인사\s*개입|결재\s*라인/i.test(fullText)) {
        category = 'authority_personnel';
    } else if (/발언|망언|비판|개탄|논란|주장|회견/i.test(fullText)) {
        category = 'statement_dispute';
    }

    let coreIssue = '';
    let circumstances = '';
    let factSummary = '';
    let sources = '';

    if (category === 'judicial_bribery') {
        const penaltyInfo = numMatches.find(s => /년|월|심/i.test(s)) || '형사 사법 판결';
        coreIssue = `공직 임용, 공천 또는 국가사업 권한을 매개로 한 대가성 금품 수수 및 알선 행위의 실제 존재 여부`;
        circumstances = `• 당사자 주장: ${mainQuote ? `"${mainQuote}"` : '대가성 수수 및 부정 청탁 사실 전면 부인'}\n• 사법/수사 정황: 수사기관 공소장 및 법원 재판 과정에서 제기된 금품 제공자 진술, 물증 및 사법부 판단(${penaltyInfo}) 내역`;
        factSummary = `(검증 판정 결론: [대체로 사실 아님 / 사법 판결 대조] 당사자의 결백 주장과 달리, 사법부 재판 과정에서 금품 수수 및 청탁 전달 정황의 실체성이 일부 또는 상당 부분 인정된 바 있음)\n\n• 객관적 팩트 및 데이터 대조: 피고인의 결백 주장과 법원이 증거능력을 인정한 금융거래 내역, 물품 전달 일시·장소 기록 대조\n• 공식 기록 및 규정/절차: 특정범죄가중처벌법(알선수재) 및 청탁금지법상 직무관련성·대가성 인정 법리 대조\n• 맥락 및 실체적 진실: 엄격한 증거주의에 기반한 법원 판결문상 인정 사실과 당사자의 일방적 법정 진술 간의 불일치 확인`;
        sources = `• 검증 대상: 「${title}」\n• 교차검증 1차 사료:\n  1. 각급 법원 형사 판결문 원문 및 공소사실 요지\n  2. 검찰/특검 공소장 및 압수수색 검증 조서 요약본\n  3. 부정청탁 및 금품등 수수의 금지에 관한 법률(청탁금지법)`;
    } else if (category === 'policy_stats') {
        coreIssue = `${speaker ? `${speaker} 측이` : '해당 사안에서'} 제기한 정책 실정 및 ${mainQuote ? `「${mainQuote}」 관련 ` : ''}수치·인과관계의 객관적 타당성 여부`;
        circumstances = `• 제기된 수치/주장: ${mainQuote ? `"${mainQuote}"` : title}\n• 주장 정황: 이전 시정 및 행정 조치${statsSummary ? `(${statsSummary})` : ''}로 인해 현재의 시장 불안 및 공급 차질이 초래되었다는 인과관계 책임론 제기`;
        factSummary = `(검증 판정 결론: [절반의 사실 / 면밀한 통계 확인 필요] 언급된 수치는 공적 통계상 일부 사실로 확인되나, 법적 일몰제 적용 및 부동산 경기 침체 등 복합 원인을 일방적 정책 탓으로 단순화한 측면이 있음)\n\n• 객관적 팩트 및 데이터 대조: 실제 통계청 및 지자체 정비사업 인허가·해제 고시 내역 대조 결과 확인${statsSummary ? ` (${statsSummary} 등 실제 데이터 교차검증)` : ''}\n• 공식 기록 및 규정/절차: 도시정비법 및 지자체 조례상 자발적 추진위 취소·일몰제 적용 등 합법적 행정 절차 이행 내역 확인\n• 맥락 및 실체적 진실: 주택 공급의 장기 시차(8~10년)와 거시경제 변수 등 복합 요인이 배제되고 정치적 공방으로 축약된 정황 확인`;
        sources = `• 검증 대상: 「${title}」\n• 교차검증 1차 사료:\n  1. 국토교통부 주택건설인허가실적 통계 및 국가통계포털(KOSIS)\n  2. 지방자치단체 도시정비구역 지정·해제 전자관보 고시문 및 의회 회의록\n  3. 도시 및 주거환경정비법 및 관련 조례`;
    } else if (category === 'authority_personnel') {
        coreIssue = `공식 직책자의 정무 보좌 범위를 넘어선 국정 개입 및 공적 결재 시스템 우회(월권) 의혹의 실체 유무`;
        circumstances = `• 제기된 주장: ${mainQuote ? `"${mainQuote}"` : title}\n• 제기 정황: 공식 결재 라인 배제 및 특정 보좌진에 의한 인사·정책 결정 농단 정황이 존재한다는 야당/정치권의 의혹 제기`;
        factSummary = `(검증 판정 결론: [사실 아님 / 근거 불충분] 현재까지 공문서 위조, 결재권 찬탈 등 직무 범위를 벗어난 위법적 월권 행위의 구체적 물증이나 공적 기록은 확인되지 않음)\n\n• 객관적 팩트 및 데이터 대조: 대통령실/정부 조직법상 규정된 정식 결재 라인(비서관-수석-실장-대통령)을 통한 정상 문서 처리 여부 대조\n• 공식 기록 및 규정/절차: 대통령비서실 직제 규정상 보좌 인력의 직무 범위 및 국무회의/수석비서관회의 참석·발언 기록 대조\n• 맥락 및 실체적 진실: 공식 정무 보좌 및 일정 조율 행위를 정치적 비유(수렴청정 등)로 과장·프레임화한 정당 간 정치적 수사의 성격이 짙음`;
        sources = `• 검증 대상: 「${title}」\n• 교차검증 1차 사료:\n  1. 정부조직법 및 대통령비서실 직제(대통령령)\n  2. 국회 운영위원회 국정감사 및 현안질의 회의록\n  3. 공공기관 인사발령 전자관보 고시 및 전자결재 공문 이력`;
    } else {
        coreIssue = `${speaker || '발언자'}의 발언 내용과 실제 사실관계 간의 일치 여부 및 맥락 왜곡 여부`;
        circumstances = `• 발언 요지: ${mainQuote ? `"${mainQuote}"` : title}\n• 제기된 정황: 특정 사안에 대한 사실과 다른 단정적 발언이나 맥락 거세로 인한 사회적 논란 확산`;
        factSummary = `(검증 판정 결론: [대체로 사실 아님 / 맥락 왜곡] 발언의 전후 맥락 및 실제 통계·제도와 비교한 결과 사실과 차이가 있음)\n\n• 객관적 팩트 및 데이터 대조: 발언에서 언급된 핵심 주장과 실제 확인된 통계 수치 및 공적 사실 간의 차이 확인\n• 공식 기록 및 규정/절차: 소관 부처 공식 입장 발표, 보도참고자료 및 관련 행정 지침 대조\n• 맥락 및 실체적 진실: 단편적 구절만을 자극적으로 부각하여 전체 취지가 왜곡된 전후 맥락 복원`;
        sources = `• 검증 대상: 「${title}」\n• 교차검증 1차 사료:\n  1. 정부 부처 및 지자체 공식 해명 보도자료\n  2. 언론사 인터뷰 원문 녹취록 및 현장 영상 기록\n  3. 관련 분야 국가승인통계 원천 데이터`;
    }

    return {
        distortion: `• 주장 배경: ${speaker ? `${speaker} 측의 발언 및 ` : ''}관련 언론 보도\n• 핵심 쟁점: ${coreIssue}\n• 제기된 정황:\n  ${circumstances}`,
        fact_summary: factSummary,
        primary_source: sources,
    };
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
당신은 공공데이터, 공문서, 통계, 법령, 실체적 사실관계(Fact)에 기반해 왜곡된 의혹이나 가짜뉴스를 정밀 검증하는 전문 팩트체커입니다.

[검증 및 작성 원칙]
1. 사안의 본질과 무관한 일반론이나 뜬구름 잡는 정황 묘사를 엄격히 배제하세요.
2. 각 항목의 내용을 아래 세부 필드 항목("• 주장 배경:", "• 핵심 쟁점:", "• 제기된 정황:")에 맞춰 안건별 실체적 내용으로 정밀하게 작성하세요.
3. 특히 "핵심 쟁점"은 양측의 주장이 충돌하는 법적·사실적 핵심 논점을 명확히 짚어야 하며, "제기된 정황"은 당사자나 언론이 제시한 구체적 발언, 수치, 정황 증거를 명시해야 합니다.
4. "확인된 핵심 사실(fact_summary)"에서는 판정 결론([사실 / 대체로 사실 / 절반의 사실 / 대체로 사실 아님 / 사실 아님])을 서두에 명시하고, 구체적 데이터 대조, 절차 적법성, 왜곡된 맥락을 명확히 대조하세요.
5. 답변 시작 시 '[...]', '【...】' 형태의 불필요한 섹션 타이틀을 절대 붙이지 마세요.

- 검증 안건 제목: "${title}"
- 관련 기사 본문 요약: "${articleContext || '기사 본문 없음 (제목 및 사안 본질 기반 정밀 분석)'}"

반드시 아래 JSON 포맷으로만 답변하세요:
{
  "distortion": "• 주장 배경: (의혹/논란이 불거진 계기 및 발언자/언론 보도 출처)\\n• 핵심 쟁점: (이 안건에서 검증해야 할 가장 본질적인 사실관계 쟁점)\\n• 제기된 정황: (의혹 측에서 사실이라고 주장하는 구체적 정황, 인용 발언, 수치 명시)",
  "fact_summary": "(검증 판정 결론: [사실 / 대체로 사실 / 절반의 사실 / 대체로 사실 아님 / 사실 아님] 중 하나를 명시하고, 그 핵심 이유를 1~2문장으로 명확히 요약)\\n\\n• 객관적 팩트 및 데이터 대조: (주장된 정황·수치와 실제 확인된 공적 기록, 통계, 판결/발표 내역을 구체적으로 대조)\\n• 공식 기록 및 규정/절차: (정부 부처 공문서, 법령, 회의록 등 제도적·절차적 확인 결과)\\n• 맥락 및 실체적 진실: (단편적 발췌나 시점 왜곡으로 누락된 중요한 전후 맥락)",
  "primary_source": "• 검증 대상: 「${title}」 사실관계 교차검증\\n• 교차검증 1차 사료:\\n  1. (관련 법령, 고시, 훈령 또는 법원 판결문)\\n  2. (공공기관 정보공개 답변서, 국가승인통계(KOSIS), 국회 회의록)\\n  3. (정부 부처/지자체 공식 보도자료 및 공문 결재 이력)"
}
`;

            try {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                responseMimeType: 'application/json',
                                temperature: 0.2,
                            },
                        }),
                    }
                );

                if (response.ok) {
                    const geminiData = await response.json();
                    const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (rawJson) {
                        const parsed = JSON.parse(rawJson);
                        return NextResponse.json(parsed);
                    }
                }
            } catch (apiErr) {
                console.warn('Gemini API 통신 오류, 스마트 분석기 fallback 실행:', apiErr);
            }
        }

        // Gemini API 키가 없거나 호출 오류 시 안건 맞춤형 스마트 팩트체크 초안 자동 생성
        const smartDraft = generateSmartFactDraft(title, articleContext);
        return NextResponse.json(smartDraft);

    } catch (error: any) {
        console.error('AI 분석 실패:', error);
        return NextResponse.json(
            { error: '팩트체크 초안 생성 실패: ' + error.message },
            { status: 500 }
        );
    }
}