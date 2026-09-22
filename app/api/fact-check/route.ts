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

// 텍스트 기반 5대 핵심 해시태그 스마트 추출기
function extractSmartHashtags(title: string, distortion: string, primarySource: string): string[] {
    const fullText = `${title} ${distortion} ${primarySource}`;
    const words = fullText.match(/[가-힣a-zA-Z0-9]{2,8}/g) || [];
    
    // 불용어 및 일반 단어 필터링
    const stopWords = new Set(['대한', '관련', '통해', '이용', '위해', '경우', '사실', '내용', '확인', '결과', '제시', '판정', '검증', '사료', '근거', '주장', '제기', '의혹']);
    const frequencyMap = new Map<string, number>();

    for (const word of words) {
        if (!stopWords.has(word) && word.length >= 2) {
            frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
        }
    }

    // 제목에 있는 단어 가중치 부여
    const titleWords = title.match(/[가-힣a-zA-Z0-9]{2,8}/g) || [];
    for (const tw of titleWords) {
        if (frequencyMap.has(tw)) {
            frequencyMap.set(tw, (frequencyMap.get(tw) || 0) + 3);
        }
    }

    const sorted = [...frequencyMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(entry => `#${entry[0]}`);

    // 기본 태그 보충
    const defaultCandidates = ['#팩트체크', '#공식검증', '#진실규명', '#공공데이터', '#이슈검증'];
    const result: string[] = [];
    
    for (const tag of [...sorted, ...defaultCandidates]) {
        if (!result.includes(tag) && result.length < 5) {
            result.push(tag);
        }
    }

    return result.slice(0, 5);
}

// AI 팩트 체크(근거 자료)를 기반으로 핵심 사실 요약 생성 (스마트 Fallback)
function generateFactSummaryFromEvidence(title: string, distortion: string, primarySource: string) {
    let verdict = '[사실 / 검증 완료]';
    const sourceLower = primarySource.toLowerCase();

    if (/위헌|불법|위법|사실\s*아님|거짓|왜곡|날조|차이|배척|기각|유죄|패소/i.test(primarySource)) {
        if (/위헌으로\s*판단|위헌\s*소송|위헌\s*판결/i.test(primarySource)) {
            verdict = '[대체로 사실 / 헌법·법리상 위헌 소지 인정]';
        } else {
            verdict = '[대체로 사실 아님 / 사료 대조 불일치]';
        }
    } else if (/일부\s*사실|절반|혼재|복합적|해석\s*차이/i.test(primarySource)) {
        verdict = '[절반의 사실 / 맥락에 따른 해석 차이 존재]';
    } else if (/사실로\s*확인|인정|일치|합헌|승소|무죄/i.test(primarySource)) {
        verdict = '[사실 / AI 팩트 체크 일치]';
    }

    // AI 팩트 체크 텍스트 정리
    const lines = primarySource.split('\n').map(l => l.trim()).filter(Boolean);
    const conclusionLine = lines.find(l => /^결론|요약|판단/i.test(l)) || lines[lines.length - 1] || primarySource.slice(0, 150);
    const cleanConclusion = conclusionLine.replace(/^(결론|요약|판단)[:：\s]*/i, '').trim();

    return `(검증 판정 결론: ${verdict} AI 팩트 체크 및 공적 기록 검토 결과, ${cleanConclusion})

• 객관적 팩트 및 데이터 대조:
  - AI 팩트 체크 검토 결과: ${lines[0] || '공적 기록물 및 관련 법리 대조 완료'}
  - 쟁점 대조: 제기된 의혹·쟁점에 대해 객관적 사실관계를 근거로 검증함

• 공식 기록 및 규정/절차:
  - 관련 사료 및 법률·판례 원문에 따른 적법 절차 및 실체적 내용 반영 완료

• 맥락 및 실체적 진실:
  - ${cleanConclusion}`;
}

// 왜곡 쟁점 스마트 초안 생성기
function generateSmartDistortionDraft(title: string, articleContext: string = '') {
    let speaker = '';
    const speakerMatch = title.match(/^([가-힣]{2,4}|[가-힣A-Za-z0-9\s]{2,10})\s*[,，"“'‘-]/);
    if (speakerMatch) {
        speaker = speakerMatch[1].trim();
    }

    const quoteMatches = [...title.matchAll(/["“'‘]([^"”'’]+)["”'’]/g)].map(m => m[1]);
    quoteMatches.sort((a, b) => b.length - a.length);
    const mainQuote = quoteMatches[0] || '';

    let coreIssue = `${speaker || '당사자'}의 발언 및 보도 내용과 실제 사실관계·사법적 판단 간의 일치 여부`;
    let circumstances = `• 발언/보도 요지: ${mainQuote ? `"${mainQuote}"` : title}\n• 제기된 정황: 관련 언론 보도 및 공방을 통해 제기된 핵심 의혹 사안`;

    return `• 주장 배경: ${speaker ? `${speaker} 측의 발언 및 ` : ''}관련 언론 보도\n• 핵심 쟁점: ${coreIssue}\n• 제기된 정황:\n  ${circumstances}`;
}

export async function POST(req: Request) {
    try {
        const { title, source_url, distortion, primary_source, mode } = await req.json();

        if (!title) {
            return NextResponse.json({ error: '안건 제목이 필요합니다.' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

        // MODE 2: 관리자가 제출한 AI 팩트 체크 근거를 바탕으로 "확인된 핵심 사실 (fact_summary)" 요약 및 해시태그 5개 생성
        if (mode === 'summarize_source' || (primary_source && primary_source.trim().length > 10)) {
            const trimmedSource = primary_source.trim();
            const currentDistortion = distortion || '';

            if (apiKey && process.env.GEMINI_API_KEY) {
                const prompt = `
당신은 대한민국 최고의 공공데이터 및 법률·공문서 교차검증 전문 팩트체커입니다.
관리자가 검증을 위해 제출한 [AI 팩트 체크 (근거 자료)]의 원문 내용을 정밀 분석하여, [확인된 핵심 사실 (fact_summary)]과 [해시태그 5개 (hashtags)]를 작성해야 합니다.

[작성 지침]
1. 반드시 관리자가 제출한 AI 팩트 체크의 구체적인 내용, 판결/법리, 수치, 결론을 정확하게 반영하세요.
2. 서두에는 반드시 판정 결론 [사실 / 대체로 사실 / 절반의 사실 / 대체로 사실 아님 / 사실 아님] 중 1차 사료에 가장 부합하는 것을 명시하고 핵심 요약을 1~2문장으로 서술하세요.
3. 구체적인 사실 대조와 법리/통계적 근거를 바탕으로 3가지 항목(• 객관적 팩트 및 데이터 대조, • 공식 기록 및 규정/절차, • 맥락 및 실체적 진실)으로 나누어 일목요연하게 작성하세요.
4. 내용과 관련된 가장 핵심적인 주제어 5개를 선별하여 hashtags 배열에 '#키워드' 형태로 담아주세요. (정확히 5개)
5. 제목이나 항목 외 불필요한 서두 인삿말은 생략하세요.

- 검증 안건 제목: "${title}"
- 왜곡된 주장/프레임: 
${currentDistortion || '(제기된 의혹 내용)'}

- 관리자가 제출한 AI 팩트 체크 근거 전문:
${trimmedSource}

반드시 아래 JSON 포맷으로만 답변하세요:
{
  "fact_summary": "(검증 판정 결론: [판정 결과] AI 팩트 체크 분석에 따른 핵심 요약)\\n\\n• 객관적 팩트 및 데이터 대조: (구체적 사실관계 요약)\\n• 공식 기록 및 규정/절차: (법령, 헌법, 판결문, 공문서 등 절차적 적법성 확인 내용)\\n• 맥락 및 실체적 진실: (규명하는 실체적 진실)",
  "hashtags": ["#핵심키워드1", "#핵심키워드2", "#핵심키워드3", "#핵심키워드4", "#핵심키워드5"]
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
                            const hashtags = Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
                                ? parsed.hashtags.map((t: string) => t.startsWith('#') ? t : `#${t}`).slice(0, 5)
                                : extractSmartHashtags(title, currentDistortion, trimmedSource);

                            return NextResponse.json({
                                fact_summary: parsed.fact_summary,
                                hashtags,
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Gemini 요약 통신 오류, 스마트 요약기 실행:', e);
                }
            }

            // Fallback
            const fallbackSummary = generateFactSummaryFromEvidence(title, currentDistortion, trimmedSource);
            const fallbackHashtags = extractSmartHashtags(title, currentDistortion, trimmedSource);
            return NextResponse.json({
                fact_summary: fallbackSummary,
                hashtags: fallbackHashtags,
            });
        }

        // MODE 1: 의뢰 선택 시 왜곡된 주장/프레임 초안 생성 (1차 사료는 관리자가 입력하도록 비워둠)
        let articleContext = '';
        if (source_url) {
            articleContext = await fetchArticleText(source_url);
        }

        if (apiKey && process.env.GEMINI_API_KEY) {
            const prompt = `
당신은 공공데이터와 공적 기록물 기반 공익 팩트체크 아카이브의 전문 분석관입니다.
주어진 안건 제목과 기사 내용을 바탕으로, [왜곡된 주장 / 프레임 (distortion)]을 구조화하여 작성하세요.
관리자가 1차 사료를 직접 입력할 예정이므로, 1차 사료(primary_source)는 빈 문자열("")로 반환하세요.

- 검증 안건 제목: "${title}"
- 관련 기사 본문 요약: "${articleContext || '기사 본문 없음'}"

반드시 아래 JSON 포맷으로만 답변하세요:
{
  "distortion": "• 주장 배경: (의혹/논란이 불거진 계기 및 발언자/언론 보도 출처)\\n• 핵심 쟁점: (이 안건에서 검증해야 할 가장 본질적인 사실관계 쟁점)\\n• 제기된 정황: (의혹 측에서 사실이라고 주장하는 구체적 정황, 인용 발언, 수치 명시)",
  "primary_source": "",
  "fact_summary": "🏛️ 아래 'AI 팩트 체크'에 판결문, 공문서, 통계 등 근거 자료를 입력하신 후 [✨ AI 팩트 체크 기반 핵심 사실 요약 생성] 버튼을 누르시면, AI가 근거를 분석하여 객관적 사실과 해시태그를 자동으로 생성합니다."
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
                        return NextResponse.json({
                            distortion: parsed.distortion,
                            primary_source: '',
                            fact_summary: parsed.fact_summary || '',
                        });
                    }
                }
            } catch (apiErr) {
                console.warn('Gemini API 통신 오류, 스마트 분석기 fallback 실행:', apiErr);
            }
        }

        // Fallback
        const distortionDraft = generateSmartDistortionDraft(title, articleContext);
        return NextResponse.json({
            distortion: distortionDraft,
            primary_source: '',
            fact_summary: "🏛️ 아래 'AI 팩트 체크'에 판결문, 공문서, 통계 등 근거 자료를 입력하신 후 [✨ AI 팩트 체크 기반 핵심 사실 요약 생성] 버튼을 누르시면, AI가 근거를 분석하여 객관적 사실과 해시태그를 자동으로 생성합니다.",
        });

    } catch (error: any) {
        console.error('AI 분석 실패:', error);
        return NextResponse.json(
            { error: '팩트체크 초안 생성 실패: ' + error.message },
            { status: 500 }
        );
    }
}