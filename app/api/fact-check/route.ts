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

// 역사적 사건/숫자 복합어 정규화 (5·18, 5.18 -> 518)
function normalizeHistoricalTerms(text: string): string {
    return text
        .replace(/5[·\.\-\s]18/g, '518')
        .replace(/4[·\.\-\s]3/g, '43사건')
        .replace(/3[·\.\-\s]1/g, '31절')
        .replace(/6[·\.\-\s]25/g, '625전쟁');
}

// 동사/형용사/용언 종결·연결 어미 판별기
function isVerbOrAdjective(word: string): boolean {
    const verbEndings = [
        '으면', '면', '어도', '아도', '어서', '아서', '여서', '거나', '든지', '더니',
        '면서', '려고', '도록', '으니', '니까', '는다', 'ㄴ다', '았다', '었다', '였다',
        '겠다', '한다', '된다', '됐다', '이다', '아냐', '않아', '없다', '있다', '받은',
        '받는', '받아', '뺏은', '지은', '하는', '되는', '했던', '됐던', '보인다', '알려졌다',
        '있어', '없어', '않는', '못한', '뺏는다', '지으면', '뺏은'
    ];

    for (const ending of verbEndings) {
        if (word.endsWith(ending) && word.length >= ending.length + 1) {
            // 명사 자체가 해당 글자로 끝나는 예외 단어 목록
            const nounExceptions = new Set([
                '라면', '수면', '화면', '지면', '정면', '측면', '후면', '사면', '비대면',
                '시민', '국민', '주민', '의원', '대변인', '위원장', '대표', '판결', '호도'
            ]);
            if (nounExceptions.has(word)) return false;
            return true;
        }
    }

    return false;
}

// 한국어 명사 정제 및 조사/어미 제거 헬퍼
function cleanKoreanNoun(word: string): string | null {
    if (!word) return null;

    // 순수 숫자(18, 1, 2) 제외하되, 역사적 키워드 518, 625, 43은 허용
    if (/^\d+$/.test(word)) {
        if (word === '518' || word === '625' || word === '43') return word;
        return null;
    }
    if (word.length < 2) return null;

    // 따옴표나 괄호 등 기호 제거
    word = word.replace(/^[‘'“"(\[<]+|[’'”")\]>]+$/g, '');

    // 조사 및 어미 제거 패턴 (긴 접미사부터 매칭)
    const particleSuffixes = [
        '누군가에게', '에게서는', '에서는', '에게서', '에게는', '에게도',
        '으로는', '으로써', '로서의', '에서의', '으로의', '에서는',
        '에게', '에서', '으로', '로써', '로서', '과의', '와의',
        '이나', '이나마', '지만', '은커녕',
        '에는', '에도', '까지', '부터', '마다', '처럼', '만큼',
        '은', '는', '이', '가', '을', '를', '의', '에', '로', '와', '과', '도', '만'
    ];

    for (const suffix of particleSuffixes) {
        if (word.endsWith(suffix) && word.length > suffix.length + 1) {
            word = word.slice(0, -suffix.length);
            break;
        }
    }

    // 조사 제거 후 동사/형용사 판별
    if (isVerbOrAdjective(word)) return null;

    // 순수 숫자인지 재확인 (518, 625 제외)
    if (/^\d+$/.test(word) && word !== '518' && word !== '625' && word !== '43') return null;
    if (word.length < 2) return null;

    return word;
}

// 한국어 인명(Person) 추출 헬퍼 (알려진 주요 인물, 직책/호칭 결합형, 한국 성명 패턴)
function extractPersonNames(text: string): string[] {
    const knownPersons = [
        '김현지', '윤석열', '이재명', '한동훈', '오세훈', '박원순', '김건희', '최재영',
        '조국', '문재인', '박근혜', '지만원', '이준석', '추미애', '홍준표', '안철수',
        '정진상', '김용', '유동규', '곽상도', '원희룡', '김만배', '남욱', '정영학',
        '명태균', '강혜경', '이화영', '김성태'
    ];

    const detected = new Set<string>();

    // 1. 이미 알려진 주요 공직자/사건 인명 검출
    for (const name of knownPersons) {
        if (text.includes(name)) {
            detected.add(name);
        }
    }

    // 2. 직책 및 호칭과 결합된 인명 검출 (예: "김현지 실장", "최재영 목사", "박원순 전 시장", "지만원 씨")
    const titleRegex = /([김이박최정강조윤장임한신오서권황송류유홍고문양손배백허노심하곽성차주우구라민진지엄채원천방공현][가-힣]{1,2})\s*(?:실장|비서관|대통령|장관|차관|의원|대표|총장|지사|시장|구청장|목사|교수|변호사|판사|검사|기자|씨|여사|측)/g;
    let match;
    while ((match = titleRegex.exec(text)) !== null) {
        const candidate = match[1];
        if (candidate.length >= 2 && candidate.length <= 3) {
            detected.add(candidate);
        }
    }

    // 3. 괄호 안 인명 표기 검출 (예: 피고(지만원))
    const bracketRegex = /\(([김이박최정강조윤장임한신오서권황송류유홍고문양손배백허노심하곽성차주우구라민진지엄채원천방공현][가-힣]{1,2})\)/g;
    while ((match = bracketRegex.exec(text)) !== null) {
        const candidate = match[1];
        if (candidate.length >= 2 && candidate.length <= 3) {
            detected.add(candidate);
        }
    }

    return Array.from(detected);
}

// 텍스트 기반 5대 핵심 해시태그 스마트 추출기 (기존 태그 보존 및 본문 인명 최우선 가중치)
function extractSmartHashtags(
    title: string,
    distortion: string,
    primarySource: string,
    existingHashtags: string[] = []
): string[] {
    // 0. 기존 해시태그 정제
    const cleanExisting = (existingHashtags || [])
        .map(t => String(t).replace(/^#/, '').trim())
        .filter(Boolean);

    // 이미 5개 이상 존재하면 기존 목록 그대로 유지
    if (cleanExisting.length >= 5) {
        return cleanExisting.slice(0, 5).map(t => `#${t}`);
    }

    const fullText = normalizeHistoricalTerms(`${title} ${distortion} ${primarySource}`);

    // 1. 제외할 불용어 (시간부사, 동사, 형용사, 대명사, 일반 추상어, 접속사)
    const stopWords = new Set([
        '대한', '관련', '통해', '이용', '위해', '경우', '사실', '내용', '확인', '결과',
        '제시', '판정', '검증', '사료', '근거', '주장', '제기', '의혹', '이유', '때문',
        '모습', '자신', '결코', '다시', '누군가', '그것', '이것', '저것', '모든', '어떤',
        '각종', '이후', '이전', '당시', '초기', '과거', '현재', '최근', '이러한', '그러한',
        '이를', '하지만', '그러나', '그리고', '또한', '함께', '가장', '매우', '결국',
        '바로', '그대로', '원문', '자료', '측면', '단계', '자체', '수단', '포함', '제외',
        '기준', '비해', '대해', '있으며', '있으나', '있고', '이며', '아니라', '아닌',
        '보아', '가까운', '드러나면서', '다뤄졌습니다', '따르면', '따라', '의한', '위한',
        '대통령', '사람', '것이다', '것으로', '진실', '아냐', '가능성', '있어', '요약',
        '프레임', '실제', '판결문', '역사적', '공인한', '피고', '탄핵하기', '가정',
        '판단', '왜곡한', '것입니다', '정황', '발언', '보도', '요지', '사안', '활동',
        '배경', '쟁점', '핵심', '호도'
    ]);

    // 2. 가중치를 부여할 핵심 법률/사법/사건/도메인 키워드
    const domainBonusKeywords = [
        '518', '북한간첩', '간첩', '북한군', '지만원', '광주고법', '허위호도',
        '한동훈', '이재명', '농지', '농지법', '경자유전', '처분명령', '농사', '재반박',
        '뇌물', '뇌물죄', '단순수뢰', '수뢰', '알선수재', '알선수재죄', '공동정범', '제3자뇌물', '제3자뇌물수수',
        '직무관련성', '대가성', '청탁금지법', '김영란법', '경제적공동체', '포괄적권한', '신고의무', '신분범',
        '김건희', '최재영', '윤석열', '특가법', '공소시효', '수사의무', '기소', '불기소', '구속'
    ];

    // 본문 및 텍스트에서 인명(Person) 추출 - 최우선 순위
    const detectedPersons = extractPersonNames(fullText);

    const freqMap = new Map<string, number>();

    // 3. 본문 텍스트 내 단어 토큰화 및 가중치 계산
    const rawTokens = fullText.match(/[가-힣a-zA-Z0-9]{2,15}/g) || [];

    for (const raw of rawTokens) {
        const cleaned = cleanKoreanNoun(raw);
        if (!cleaned || stopWords.has(cleaned)) continue;

        let weight = 1;
        // 도메인 핵심어 보너스 (+6)
        if (domainBonusKeywords.some((k) => cleaned === k || cleaned.includes(k))) {
            weight += 6;
        }
        // 인명 보너스 (+15)
        if (detectedPersons.includes(cleaned)) {
            weight += 15;
        }
        // 전문 용어 길이 보너스 (3글자 이상: 알선수재, 직무관련성 등)
        if (cleaned.length >= 3) {
            weight += 1;
        }

        freqMap.set(cleaned, (freqMap.get(cleaned) || 0) + weight);
    }

    // 4. 괄호 안에 있는 인물/단어 가중치: 피고(지만원) -> 지만원 (+8)
    const bracketMatches = fullText.match(/\(([가-힣a-zA-Z0-9]{2,10})\)/g) || [];
    for (const b of bracketMatches) {
        const inside = b.replace(/[()]/g, '');
        const cleaned = cleanKoreanNoun(inside);
        if (cleaned && !stopWords.has(cleaned)) {
            freqMap.set(cleaned, (freqMap.get(cleaned) || 0) + 8);
        }
    }

    // 5. 제목(Title)에 등장하는 단어는 최우선 가중치 (+10)
    const titleTokens = normalizeHistoricalTerms(title).match(/[가-힣a-zA-Z0-9]{2,15}/g) || [];
    for (const raw of titleTokens) {
        const cleaned = cleanKoreanNoun(raw);
        if (cleaned && !stopWords.has(cleaned)) {
            freqMap.set(cleaned, (freqMap.get(cleaned) || 0) + 10);
        }
    }

    // 6. 따옴표나 강조 기호('...') 안에 있는 단어 가중치 (+5)
    const quoteMatches = fullText.match(/['"‘“]([가-힣a-zA-Z0-9]{2,15})['"’”]/g) || [];
    for (const q of quoteMatches) {
        const word = q.replace(/['"‘“’”]/g, '');
        const cleaned = cleanKoreanNoun(word);
        if (cleaned && !stopWords.has(cleaned)) {
            freqMap.set(cleaned, (freqMap.get(cleaned) || 0) + 5);
        }
    }

    // 빈도 및 가중치 순 정렬
    const sorted = [...freqMap.entries()]
        .filter(([word]) => !stopWords.has(word) && word.length >= 2 && (!/^\d+$/.test(word) || word === '518'))
        .sort((a, b) => b[1] - a[1]);

    // 결과 해시태그 목록 조립
    // [우선순위 1]: 기존에 이미 등록된 해시태그 보존
    const picked: string[] = [...cleanExisting];

    // [우선순위 2]: 본문/제목에서 발견된 인명 추가
    for (const person of detectedPersons) {
        if (picked.length >= 5) break;
        if (!picked.includes(person) && !stopWords.has(person)) {
            picked.push(person);
        }
    }

    // [우선순위 3]: 가중치 순 정렬된 핵심 단어 보충
    for (const [word] of sorted) {
        if (picked.length >= 5) break;
        const isDuplicate = picked.some(
            (p) => p === word || (p.length > 2 && word.length > 2 && (p.includes(word) || word.includes(p)))
        );
        if (!isDuplicate) {
            picked.push(word);
        }
    }

    // 만약 5개 미만인 경우 도메인 후보군으로 안전 보충
    const defaultCandidates = ['팩트체크', '사법쟁점', '공식검증', '진실규명', '법리검토'];
    for (const cand of defaultCandidates) {
        if (picked.length >= 5) break;
        if (!picked.includes(cand)) {
            picked.push(cand);
        }
    }

    return picked.slice(0, 5).map((w) => `#${w}`);
}

// AI 팩트 체크(근거 자료)를 기반으로 핵심 사실 요약 생성 (검증 판정 결론 위주 스마트 요약기)
function generateFactSummaryFromEvidence(title: string, distortion: string, primarySource: string): string {
    let verdict = '절반의 사실';
    let verdictSub = '추측과 정황·정치적 주장은 존재하나 실체적 진실 미확정';

    // 1. 내용 기반 판정 결론 엄격 판별
    // (1) 명백한 허위/위헌/불법/기각 등 사법적 배척이 확인된 경우
    const hasDefinitiveFalse = /위헌으로\s*판단|법원에서\s*배척|명백한\s*허위|날조|사실\s*아님/i.test(primarySource);
    // (2) 공문서, 판결문, 공식 통계, 백서, 수사결과 등 객관적 실증 물증이 존재하는 경우
    const hasHardEvidence = /판결문|법원\s*판결|수사\s*결과|감사원\s*감사|공식\s*통계|백서|조례\s*개정|사실에\s*부합|사실과\s*일치/i.test(primarySource);
    // (3) 일방의 주장, 의혹 제기, 풍문, 설, 공방, 프레임, 부인 위주의 서술인지 검사
    const isAllegationOnly = /의혹|주장|거론|비판|프레임|공세|추측|설\s*등|부인하고\s*있|입장입니다/i.test(primarySource);

    if (hasDefinitiveFalse) {
        verdict = '사실 아님';
        verdictSub = '사법적·객관적 근거에 부합하지 않는 허위 의혹';
    } else if (hasHardEvidence && !isAllegationOnly) {
        verdict = '사실';
        verdictSub = '공식 공문서 및 객관적 입증 자료와 일치';
    } else if (hasHardEvidence && isAllegationOnly) {
        verdict = '대체로 사실';
        verdictSub = '핵심 사실관계는 확인되나 세부 인과관계에 공방 존재';
    } else {
        // 객관적 물증 없이 추측/정황/정치적 주장/부인만 대립하는 경우 (사용자 지적 원칙 반영)
        verdict = '절반의 사실';
        verdictSub = '추측과 정황·정치적 주장은 존재하나 객관적 실증 근거 부재';
    }

    // 2. 본문에서 핵심 문맥 라인 정제 추출
    const rawLines = primarySource
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 5 && !/^[0-9]\.\s*(핵심|사실|결론|쟁점|요약)/.test(l));

    const cleanLines = rawLines
        .map((l) => {
            return l
                .replace(/^[*•\-–]\s*/, '')
                .replace(/^[가-힣a-zA-Z0-9\s]{2,15}[:：]\s*/, '')
                .trim();
        })
        .filter((l) => l.length > 12);

    const keyFact1 = cleanLines[0] || '공적 기록 검토 결과, 제기된 안건에 관한 배경 정황이 확인되었습니다.';
    const keyFact2 = cleanLines.find((l, idx) => idx > 0 && (l.includes('수치') || l.includes('일치') || l.includes('확인') || l.includes('조례') || l.includes('제도') || l.includes('법원') || l.includes('이동') || l.includes('보좌'))) || cleanLines[1] || '';
    const keyContext = cleanLines.find((l, idx) => idx > 1 && (l.includes('반면') || l.includes('배경') || l.includes('성격') || l.includes('주장') || l.includes('갈등') || l.includes('부인') || l.includes('해명') || l.includes('입장'))) || cleanLines[2] || '';

    let summaryText = `[검증 판정 결론: ${verdict} / ${verdictSub}]\n\n`;

    if (!hasHardEvidence && isAllegationOnly) {
        // 물증 없이 정황/추측만 있는 경우의 명확한 팩트체크 요약문
        summaryText += `AI 팩트 체크 및 공적 기록 검토 결과, ${keyFact1} ${keyFact2 ? keyFact2 : ''}\n\n`;
        summaryText += `이에 대해 관계 당국 및 당사자 측은 정상적인 직무 수행 및 조직 개편이라며 관련 의혹을 전면 부인하고 있습니다. 팩트체크의 기본 원칙상 일방의 추측과 정황, 정치적 주장이 존재하더라도 이를 실체적 진실로 확정할 수 있는 객관적 물증이나 공적 조사 결과가 부재하므로 온전한 '사실(Fact)'로 단정할 수 없습니다.`;
    } else {
        // 객관적 근거가 있는 경우의 설명문
        summaryText += `AI 팩트 체크 및 공적 기록 검토 결과, ${keyFact1} ${keyFact2 ? keyFact2 : ''}\n\n`;
        if (keyContext) {
            summaryText += `다만 제기된 쟁점에 관하여는 ${keyContext}`;
        }
    }

    return summaryText.trim();
}

// 왜곡 쟁점 및 핵심 검증 대상 스마트 초안 생성기 (리포트 제목 기반 정밀 분석)
function generateSmartDistortionDraft(title: string, articleContext: string = ''): string {
    const trimmedTitle = title.trim();

    // 1. 제목 유형 분석 (질문형/속설, 의혹형, 발언형)
    const isQuestion = /[?？]|사실인가|맞는가|진실은|사실일까|진짜일까/i.test(trimmedTitle);
    const isAllegation = /의혹|논란|개입|의심|비선|수렴청정|허위|왜곡|날조|파문/i.test(trimmedTitle);

    let speaker = '';
    const speakerMatch = trimmedTitle.match(/^([가-힣]{2,4}|[가-힣A-Za-z0-9\s]{2,8})\s*[,，"“'‘-]/);
    if (speakerMatch && !isAllegation) {
        speaker = speakerMatch[1].trim();
    }

    const quoteMatches = [...trimmedTitle.matchAll(/["“'‘]([^"”'’]+)["”'’]/g)].map(m => m[1]);
    quoteMatches.sort((a, b) => b.length - a.length);
    const mainQuote = quoteMatches[0] || '';

    // 제목에서 불필요한 기호 제거한 핵심 주제어
    const cleanTopic = trimmedTitle
        .replace(/["“'‘”’?？]/g, '')
        .replace(/^(오세훈|한동훈|이재명|윤석열|대통령실|야당|여당)[,，\s]*/, '')
        .replace(/\s*(사실인가|맞는가|진실은|재반박|논란|의혹|일까|파문)$/, '')
        .trim();

    let background = '';
    let targets: string[] = [];
    let direction = '';

    if (isQuestion) {
        // [질문형 / 대중 통념 속설 검증]
        const isRealEstate = /부동산|집값|아파트|강남|청약|분양|매매|전세|불패/i.test(trimmedTitle);
        const isHealth = /코로나|백신|치료|예방|효과|약|의학|질병|건강|소금물|민간요법/i.test(trimmedTitle);

        if (isRealEstate) {
            background = `부동산 시장 및 사회 전반에 널리 퍼진 대중적 통념('[${cleanTopic || trimmedTitle}]')과 이에 대한 대중·언론의 맹신`;
            targets = [
                `1. [${cleanTopic || trimmedTitle}] 명제가 과거 실거래 통계, 공적 지표 및 거시경제 변동 데이터와 부합하는지 여부`,
                `2. 장기적 우상향 회복력과 '하락 없는 영구 불패' 개념 간의 실체적 괴리 및 예외적 침체기 사실관계 규명`
            ];
            direction = `국토교통부 실거래 통계, 한국은행 거시경제 지표 및 공공데이터를 교차 대조하여 해당 명제의 실체적 진위 검증`;
        } else if (isHealth) {
            background = `온라인 커뮤니티 및 SNS를 통해 널리 유포된 [${cleanTopic || trimmedTitle}] 관련 속설과 시민 혼선`;
            targets = [
                `1. [${cleanTopic || trimmedTitle}] 주장이 질병관리청, WHO 등 공인 보건의료 당국의 임상·실험 데이터로 입증되었는지 여부`,
                `2. 민간요법이나 잘못된 상식이 의학적 근거 없이 과학적 사실로 왜곡 유포되었는지 여부`
            ];
            direction = `질병관리청, 식품의약품안전처 및 공인 의학 학술 데이터를 바탕으로 효능의 객관적 진위 검증`;
        } else {
            background = `사회 공론장 및 대중 사이에서 널리 회자되는 [${cleanTopic || trimmedTitle}] 관련 통념과 진위 공방`;
            targets = [
                `1. [${cleanTopic || trimmedTitle}] 명제가 공인된 1차 공적 기록 및 객관적 통계 데이터와 일치하는지 여부`,
                `2. 역사적 사실이나 맥락의 단편적 왜곡으로 인한 오해 유발 소지가 있는지 여부`
            ];
            direction = `공인된 공적 기록물, 전문 연구 기관 보고서 및 통계 데이터를 교차 대조하여 실체적 진위 검증`;
        }
    } else if (isAllegation) {
        // [의혹 / 논란 검증형] - 예: 김현지 실장 "인사 개입 및 국정 수렴청정" 의혹
        background = `정치권 및 언론 매체를 통해 제기된 [${cleanTopic || trimmedTitle}] 관련 의혹 제기와 이에 대한 진영 간 책임 공방`;
        targets = [
            `1. 제기된 의혹(${mainQuote ? `"${mainQuote}"` : cleanTopic})을 입증할 수 있는 공문서, 사법부 판단, 구체적 물증의 실재 여부`,
            `2. 관계 당사자 측의 해명 및 정상 직무 범위 부합 여부와 정치적 프레임 간의 사실관계 교차 대조`
        ];
        direction = `공식 직무 규정, 사법부 판결문, 공문서 및 당사자 진술을 교차 대조하여 단순 추측과 실체적 사실관계 구분 검증`;
    } else if (speaker && mainQuote) {
        // [주요 인물/기관 발언형]
        const isLegalOrConstitutional = /헌법|위헌|합헌|법률|대법원|사법|법원|임명권|재제청|검찰|수사|기소|불기소|판결/i.test(trimmedTitle);
        const isPolicyOrRealEstate = /정비|재개발|공급|부동산|아파트|해제|규제|세금/i.test(trimmedTitle);

        if (isLegalOrConstitutional) {
            background = `${speaker} 측의 공식 발표("${mainQuote}") 및 이에 따른 헌법적 권한쟁의와 법리적 공방`;
            targets = [
                `1. 발언에서 거론된 위헌·위법 주장("${mainQuote}")이 대한민국 헌법 조항, 법원조직법 규정 및 사법부 판례에 부합하는지 여부`,
                `2. 대통령의 헌법상 임명권과 사법부의 헌법상 제청권 간의 권한 한계 및 학설·해석상 대립 실체 규명`
            ];
            direction = `헌법 조항, 법원조직법 관련 규정, 헌법재판소 판례 및 법학계 공인 학설을 교차 분석하여 위법/위헌 여부의 실체적 진위 검증`;
        } else if (isPolicyOrRealEstate) {
            background = `${speaker} 측의 공개 발언("${mainQuote}") 및 이에 따른 정책적 공방`;
            targets = [
                `1. 발언에서 거론된 핵심 사실관계("${mainQuote}") 관련 공적 통계, 조례, 행정 조치의 실재 여부`,
                `2. 발언의 인과관계 주장과 실제 행정 절차 간의 부합성 검증`
            ];
            direction = `관계 부처 및 지자체 공식 행정 백서, 조례 개정 이력, 공식 통계자료를 교차검증하여 발언 내용의 사실 부합성 검증`;
        } else {
            background = `${speaker} 측의 공개 발언("${mainQuote}") 및 이에 따른 언론 보도와 진위 공방`;
            targets = [
                `1. 발언의 핵심 주장("${mainQuote}")을 뒷받침하는 객관적 사실관계 및 실증 데이터의 실재 여부`,
                `2. 발언 맥락의 왜곡, 과장이나 일방적 정치적 프레임 개입 여부 검증`
            ];
            direction = `공인된 1차 공적 기록물 및 관련 기관 공식 발표를 교차 대조하여 발언 내용의 객관적 사실 부합성 검증`;
        }
    } else {
        // [일반 안건]
        background = `언론 보도 및 공론장을 통해 제기된 [${trimmedTitle}] 관련 주요 쟁점`;
        targets = [
            `1. 안건의 핵심 주장 및 전제 조건이 공적 기록물 및 통계 데이터와 일치하는지 여부`,
            `2. 사실관계 왜곡이나 맥락 누락으로 인한 오해 유발 소지가 있는지 여부`
        ];
        direction = `원천 1차 사료와 공공데이터를 기반으로 제기된 주장의 객관적 사실 여부 검증`;
    }

    return `• 안건 검증 배경:\n  ${background}\n\n• 핵심 검증 대상 (어떤 내용을 검증할 것인가):\n  ${targets.join('\n  ')}\n\n• 검증 방향 및 정황:\n  ${direction}`;
}

export async function POST(req: Request) {
    try {
        const { title, source_url, distortion, primary_source, mode, existing_hashtags } = await req.json();

        if (!title) {
            return NextResponse.json({ error: '안건 제목이 필요합니다.' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

        // MODE 2: 관리자가 제출한 AI 팩트 체크 근거를 바탕으로 "확인된 핵심 사실 (fact_summary)" 요약 및 해시태그 5개 생성
        if (mode === 'summarize_source' || (mode !== 'draft' && mode !== 'distortion_only' && primary_source && primary_source.trim().length > 10)) {
            const trimmedSource = primary_source.trim();
            const currentDistortion = distortion || '';
            const cleanExistingTags = (Array.isArray(existing_hashtags) ? existing_hashtags : [])
                .map((t: string) => String(t).replace(/^#/, '').trim())
                .filter(Boolean);

            if (apiKey && process.env.GEMINI_API_KEY) {
                const prompt = `
당신은 대한민국 최고의 공공데이터 및 법률·공문서 교차검증 전문 팩트체커입니다.
관리자가 검증을 위해 제출한 [AI 팩트 체크 (근거 자료)]의 원문 내용을 정밀 분석하여, [확인된 핵심 사실 (fact_summary)]과 [해시태그 5개 (hashtags)]를 작성해야 합니다.

[팩트체크 판정 및 요약 지침 - 절대 준수]:
1. [판정 엄격성 원칙 (핵심)]:
   - 구체적인 공문서, 사법부 확정 판결문, 공식 통계, 객관적 물증 없이 "일방의 정치적 주장", "의혹 제기", "풍문/설", "정황성 비판" 및 이에 대한 "당사자의 부인"만 존재하는 사안은 절대로 '사실'이나 '대체로 사실'로 판정하지 마세요.
   - 이러한 사안은 반드시 [검증 판정 결론: 절반의 사실 / 추측과 정황·정치적 주장은 존재하나 실체적 진실 미확정] 또는 [검증 판정 결론: 사실 아님 / 실체적 입증 근거 없는 일방적 의혹 제기]로 엄격히 판정해야 합니다.
   - 서술 시에도 "추측과 정황, 정치적 주장은 존재하지만 실체적 진실로 확정할 수 있는 객관적 근거가 없으므로 온전한 사실(Fact)로 규정할 수 없다"는 점을 명확히 밝히세요.

2. [확인된 핵심 사실 (fact_summary) 형식]:
   - 반드시 첫 번째 줄은 [검증 판정 결론: (판정결과) / (한 줄 핵심 판정 사유)] 형식으로 시작하세요.
     (판정결과: '사실', '대체로 사실', '절반의 사실', '대체로 사실 아님', '사실 아님' 중 택1)
   - 기계적인 불릿 포인트('• 객관적 팩트...', '• 공식 기록...') 같은 상투적 서식은 일절 쓰지 마세요.
   - AI 팩트 체크에 제시된 실질적 쟁점과 근거를 바탕으로 왜 이러한 결론이 나왔는지 시민들이 명확히 납득할 수 있는 2~3단락의 완성도 높은 서술문으로 작성하세요.

3. [해시태그 5개 추출 및 기존 태그 보존 지침 - 절대 준수]:
   - [기존 태그 보존]: 현재 사용자가 등록한 기존 해시태그 목록: [${cleanExistingTags.map(t => `#${t}`).join(', ')}]
     -> 만약 기존 태그가 이미 5개 이상이면 기존 태그를 그대로 유지하세요.
     -> 기존 태그가 1~4개이면, 기존 태그를 맨 앞에 유지하고 부족한 개수만큼만 새로 추가하여 총 5개를 맞추세요.
   - [본문 내 인명 최우선 추가]: 본문(AI 팩트 체크 근거)이나 제목에 등장하는 인명(예: #김현지, #최재영, #지만원, #오세훈 등)이 있을 경우, 반드시 최우선 순위로 해시태그에 포함하세요.
   - '당시', '이후', '현재', '최근', '초기' 같은 시간/시점 일반 부사는 절대 해시태그로 추출하지 마세요.
   - '18', '20' 등 불완전한 단순 숫자는 금지하며, 맥락상 5·18인 경우 '#518'로 완전한 명사형으로 작성하세요.
   - '지으면', '뺏는다', '받은', '없다', '있는', '누군가에게', '하는' 같은 동사/형용사/어미 결합 형태는 절대 금지합니다.
   - 반드시 사건과 쟁점의 본질을 대변하는 핵심 명사로만 최종 5개를 작성하세요.

- 검증 안건 제목: "${title}"
- 왜곡된 주장/프레임: 
${currentDistortion || '(제기된 의혹 내용)'}

- 관리자가 제출한 AI 팩트 체크 근거 전문:
${trimmedSource}

반드시 아래 JSON 포맷으로만 답변하세요:
{
  "fact_summary": "[검증 판정 결론: (판정결과) / (한 줄 핵심 판정 사유)]\\n\\nAI 팩트 체크 및 공적 기록 검토 결과, (근거 자료에서 확인된 사실관계 및 상황 요약)\\n\\n(의혹 프레임과 실체적 진실의 부합 여부, 물증 유무에 따른 판정 사유를 명쾌하게 서술)",
  "hashtags": ["#핵심명사1", "#핵심명사2", "#핵심명사3", "#핵심명사4", "#핵심명사5"]
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
                            // AI가 뽑은 해시태그 중 조동사/어미 필터링
                            let geminiTags: string[] = [];
                            if (Array.isArray(parsed.hashtags)) {
                                geminiTags = parsed.hashtags
                                    .map((t: string) => cleanKoreanNoun(String(t).replace(/^#/, '')))
                                    .filter((t: string | null): t is string => Boolean(t))
                                    .map((t: string) => `#${t}`);
                            }

                            // 해시태그 결정:
                            // 1. 이미 5개 이상 존재하면 기존 목록 100% 무조건 그대로 보존 (절대 변경 안 함!)
                            let finalTags: string[];
                            if (cleanExistingTags.length >= 5) {
                                finalTags = cleanExistingTags.slice(0, 5).map(t => `#${t}`);
                            } else {
                                // 2. 5개 미만이면 기존 태그를 최우선 유지하고 부족분만 Gemini 및 스마트 추출기에서 보충
                                finalTags = cleanExistingTags.map(t => `#${t}`);
                                for (const gt of geminiTags) {
                                    if (finalTags.length >= 5) break;
                                    if (!finalTags.includes(gt)) {
                                        finalTags.push(gt);
                                    }
                                }

                                if (finalTags.length < 5) {
                                    const smartFallback = extractSmartHashtags(title, currentDistortion, trimmedSource, cleanExistingTags);
                                    for (const fb of smartFallback) {
                                        if (finalTags.length >= 5) break;
                                        if (!finalTags.includes(fb)) {
                                            finalTags.push(fb);
                                        }
                                    }
                                }
                            }

                            const updatedDistortion = generateSmartDistortionDraft(title, trimmedSource);
                            return NextResponse.json({
                                distortion: updatedDistortion,
                                fact_summary: parsed.fact_summary,
                                hashtags: finalTags.slice(0, 5),
                            });
                        }
                    }
                } catch (e) {
                    console.warn('Gemini 요약 통신 오류, 스마트 요약기 실행:', e);
                }
            }

            // Fallback (스마트 요약기 및 인명 최우선 스마트 추출기)
            const fallbackDistortion = generateSmartDistortionDraft(title, trimmedSource);
            const fallbackSummary = generateFactSummaryFromEvidence(title, currentDistortion, trimmedSource);
            let fallbackHashtags: string[];
            if (cleanExistingTags.length >= 5) {
                fallbackHashtags = cleanExistingTags.slice(0, 5).map(t => `#${t}`);
            } else {
                fallbackHashtags = extractSmartHashtags(title, currentDistortion, trimmedSource, cleanExistingTags);
            }
            return NextResponse.json({
                distortion: fallbackDistortion,
                fact_summary: fallbackSummary,
                hashtags: fallbackHashtags.slice(0, 5),
            });
        }

        // MODE 1: 리포트 제목 기반 검증 설계 및 왜곡된 주장/프레임(어떤 내용을 검증할 것인가) 초안 생성
        let articleContext = '';
        if (source_url) {
            articleContext = await fetchArticleText(source_url);
        }

        if (apiKey && process.env.GEMINI_API_KEY) {
            const prompt = `
당신은 대한민국 최고의 공공데이터와 공적 기록물 기반 공익 팩트체크 아카이브의 전문 수석 분석관입니다.
검증 안건 제목: "${title}"
관련 기사 본문 요약: "${articleContext || '기사 본문 없음'}"

주어진 안건 제목을 정밀 분석하여, [왜곡된 주장 / 프레임] 필드에 들어갈 **'어떤 내용에 대해 검증을 진행할 것인가'에 관한 구조화된 검증 설계 요약문**을 작성하세요.

[필수 작성 및 구조화 지침 - 절대 준수]:
1. "관련 언론 보도", "당사자의 발언 및 보도 내용과 실제 사실관계·사법적 판단 간의 일치 여부", "사실 여부 확인"과 같은 무의미하고 상투적인 기계적 템플릿 문구는 절대로 쓰지 마세요.
2. 리포트 제목이 무엇을 묻거나 주장하고 있는지 맥락을 파악하여, "어떤 내용을 검증할 것인가"를 명확하고 구체적인 항목(1번, 2번)으로 도출하세요.
   - [질문형/속설형 제목 (예: '강남불패 사실인가?')]: 
     해당 대중적 통념·속설이 과거 IMF/금융위기 등 거시경제 충격기 실거래 통계와 부합하는지, '하락 없는 영구 불패'라는 맹신과 '장기적 우상향 회복력' 간의 실체적 괴리를 규명하는 구체적 검증 대상을 설정하세요.
   - [인물 발언형 제목 (예: 특정인의 발언/공방)]: 
     발언에서 거론된 핵심 수치·행정 조치·사건의 실재 여부 및 인과관계 왜곡이나 맥락 누락 여부를 검증 대상으로 설정하세요.
   - [의혹/논란형 제목 (예: 비선, 인사 개입, 특혜 의혹)]: 
     제기된 의혹을 입증할 객관적 물증이나 공문서·사법 판단의 존재 여부와 정상 직무 범위 부합 여부를 검증 대상으로 설정하세요.

3. 반드시 다음 3단계 구조로 작성하세요:
• 안건 검증 배경:
  (제목의 주제가 왜 사회적/정책적/경제적으로 화두가 되었는지, 대중적 통념 또는 언론 보도 맥락을 1~2문장으로 구체적 서술)

• 핵심 검증 대상 (어떤 내용을 검증할 것인가):
  1. (제목의 핵심 쟁점과 관련된 객관적 통계 데이터, 공문서, 규정, 사법 판단의 실재 여부)
  2. (인과관계 왜곡, 맥락 누락, 과장이나 맹신이 개입되었는지 여부)

• 검증 방향 및 정황:
  (국토교통부 실거래 통계, 공공데이터, 한국은행 지표, 행정 백서, 사법부 판결문 등 어떤 1차 사료를 교차 대조하여 진위를 판별할 것인지 명시)

반드시 아래 JSON 포맷으로만 답변하세요:
{
  "distortion": "• 안건 검증 배경:\\n  (배경 내용)\\n\\n• 핵심 검증 대상 (어떤 내용을 검증할 것인가):\\n  1. (검증 대상 1)\\n  2. (검증 대상 2)\\n\\n• 검증 방향 및 정황:\\n  (검증 방향)",
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