'use client';

export default function AboutSection() {
    return (
        <div className="space-y-6 text-neutral-200">
            {/* 상단 소개 배너 */}
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-2xl p-6 md:p-8 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-red-950 text-red-400 border border-red-800 rounded">
                        Transparency &amp; Methodology
                    </span>
                    <span className="text-xs text-neutral-400">서비스 소개 및 운영 원칙</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-3">
                    FactRepo: 공공데이터 기반 비당파적 팩트체크 아카이브
                </h2>
                <p className="text-neutral-300 text-xs md:text-sm leading-relaxed max-w-3xl">
                    FactRepo는 온라인상에서 무분별하게 확산되는 왜곡된 프레임과 허위 정보를 정화하기 위해
                    시민이 직접 의혹을 제기하고, <strong>공공데이터·법령·국회 회의록·법원 판결문 등 공적 1차 사료</strong>를
                    바탕으로 실체적 사실관계를 엄격히 교차검증하는 <strong>독립 공익 아카이브</strong>입니다.
                </p>
            </div>

            {/* 핵심 3대 운영 원칙 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-5 space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/50 flex items-center justify-center text-lg font-bold">
                        ⚖️
                    </div>
                    <h3 className="text-sm font-bold text-white">철저한 비당파성</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                        특정 정당이나 정치 집단의 이해관계를 대변하지 않으며, 모든 정파적 편향을 배제하고 오직 입증 가능한 공적 팩트만을 기준으로 판정합니다.
                    </p>
                </div>

                <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-5 space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center justify-center text-lg font-bold">
                        🏛️
                    </div>
                    <h3 className="text-sm font-bold text-white">1차 사료 중심 검증</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                        단순 언론 인용이나 '관계자 전언'을 지양하고, 국가승인통계, 전자관보, 국회 속기록, 사법부 판결문 등 원천 문서를 결정적 증거로 채택합니다.
                    </p>
                </div>

                <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-5 space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/50 flex items-center justify-center text-lg font-bold">
                        🔍
                    </div>
                    <h3 className="text-sm font-bold text-white">출처의 완전 공개</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                        모든 검증 리포트는 인쇄 가능한 표준 A4 양식의 PDF 보고서로 상시 공개되며, 누구나 검증 근거와 원천 출처를 직접 재검증할 수 있습니다.
                    </p>
                </div>
            </div>

            {/* 검증 방법론 (Methodology) 5단계 */}
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 space-y-5">
                <div className="border-b border-neutral-700 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>📋</span> 팩트체크 표준 검증 방법론 (5-Step Methodology)
                    </h3>
                    <p className="text-neutral-400 text-xs mt-1">
                        국제 팩트체킹 가이드라인에 부합하는 체계적인 사실관계 규명 절차를 준수합니다.
                    </p>
                </div>

                <div className="space-y-4 text-xs">
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-900/60 text-red-300 font-bold flex items-center justify-center shrink-0 border border-red-700 text-[11px]">
                            1
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-100 text-sm">안건 선정 및 의혹 정의 (Fact Definition)</h4>
                            <p className="text-neutral-400 mt-1 leading-relaxed">
                                시민 검증 의뢰소에서 추천 수(공감도)가 높은 안건 및 사회적 파급력이 큰 논란을 우선 선정합니다.
                                의혹의 출처, 최초 발언자, 유포 경위를 추적하고 검증해야 할 핵심 쟁점을 구체적으로 특정합니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-neutral-700 text-neutral-200 font-bold flex items-center justify-center shrink-0 border border-neutral-600 text-[11px]">
                            2
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-100 text-sm">원천 데이터 및 1차 사료 교차검증 (Cross-Verification)</h4>
                            <p className="text-neutral-400 mt-1 leading-relaxed">
                                의혹과 직접 관련된 소관 정부 부처, 지방자치단체, 법원, 통계청, 국회 기록을 직접 조회합니다.
                                정보공개청구 답변서, 전자관보 고시, 주택건설인허가실적 등 신뢰할 수 있는 공적 문서로 사실관계를 확인합니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-neutral-700 text-neutral-200 font-bold flex items-center justify-center shrink-0 border border-neutral-600 text-[11px]">
                            3
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-100 text-sm">전후 맥락 및 절차적 정당성 대조 (Contextual Analysis)</h4>
                            <p className="text-neutral-400 mt-1 leading-relaxed">
                                단편적 문구 발췌, 시점 혼동, 악의적 편집으로 인해 원래 취지가 왜곡되었는지 여부를 분석합니다.
                                관련 법령(정부조직법, 도시정비법, 청탁금지법 등)에 따른 합법적 결재 및 행정 절차의 적법성을 정밀 대조합니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-neutral-700 text-neutral-200 font-bold flex items-center justify-center shrink-0 border border-neutral-600 text-[11px]">
                            4
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-100 text-sm">5단계 사실 판정 부여 (Rating Framework)</h4>
                            <p className="text-neutral-400 mt-1 leading-relaxed">
                                자의적 주관을 배제하고 아래의 5단계 객관적 판정 기준표에 따라 실체적 진실과의 일치 여부를 판정합니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-neutral-700 text-neutral-200 font-bold flex items-center justify-center shrink-0 border border-neutral-600 text-[11px]">
                            5
                        </div>
                        <div>
                            <h4 className="font-bold text-neutral-100 text-sm">검증 보고서 발행 및 열린 아카이빙 (Open Archiving)</h4>
                            <p className="text-neutral-400 mt-1 leading-relaxed">
                                왜곡 프레임, 확인된 사실, 1차 사료 출처가 일목요연하게 정리된 검증 리포트를 웹 및 인쇄용 PDF 보고서로 영구 아카이빙합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5단계 판정 기준표 */}
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 space-y-4">
                <div className="border-b border-neutral-700 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>🎯</span> 5단계 사실 판정 기준표 (Rating Framework)
                    </h3>
                    <p className="text-neutral-400 text-xs mt-1">
                        주장의 사실 부합도에 따라 일관되고 객관적인 기준을 적용합니다.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg">
                        <span className="font-bold text-emerald-400 text-sm block mb-1">✅ 사실 (True)</span>
                        <p className="text-neutral-300 leading-relaxed">
                            주요 내용이 공적 기록, 통계, 공문서 등 객관적 1차 사료와 일치하며 중요한 맥락의 왜곡이 없는 경우.
                        </p>
                    </div>

                    <div className="p-3 bg-blue-950/30 border border-blue-800/50 rounded-lg">
                        <span className="font-bold text-blue-400 text-sm block mb-1">🔹 대체로 사실 (Mostly True)</span>
                        <p className="text-neutral-300 leading-relaxed">
                            대부분의 내용이 사실이나, 일부 경미한 수치 차이나 사소한 설명의 오류가 섞여 있는 경우.
                        </p>
                    </div>

                    <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg">
                        <span className="font-bold text-amber-400 text-sm block mb-1">⚠️ 절반의 사실 (Half True)</span>
                        <p className="text-neutral-300 leading-relaxed">
                            언급된 수치나 사실의 일부는 맞으나, 결정적인 전후 맥락이 누락되어 사실을 오도할 소지가 큰 경우.
                        </p>
                    </div>

                    <div className="p-3 bg-orange-950/30 border border-orange-800/50 rounded-lg">
                        <span className="font-bold text-orange-400 text-sm block mb-1">🔸 대체로 사실 아님 (Mostly False)</span>
                        <p className="text-neutral-300 leading-relaxed">
                            단편적인 사실이나 정황만을 자극적으로 부각하여 전체적 결론이 실체적 진실과 명백히 어긋나는 경우.
                        </p>
                    </div>

                    <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg md:col-span-2">
                        <span className="font-bold text-red-400 text-sm block mb-1">❌ 사실 아님 (False)</span>
                        <p className="text-neutral-300 leading-relaxed">
                            주요 내용이 객관적 공문서, 통계, 판결 등 1차 사료와 전면 배치되거나 명백한 허위·조작으로 확인된 경우.
                        </p>
                    </div>
                </div>
            </div>

            {/* 투명한 정정 및 이의제기 정책 (Corrections Policy) */}
            <div className="bg-neutral-800/60 border border-neutral-700/80 rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔄</span> 열린 정정 및 이의제기 정책 (Corrections Policy)
                </h3>
                <p className="text-neutral-300 text-xs leading-relaxed">
                    FactRepo는 완전무결을 자처하지 않으며, 진실을 향한 엄격한 자기 수정을 원칙으로 합니다.
                    발행된 팩트체크 리포트에 대해 새로운 공적 1차 사료나 객관적 반증 증거가 제시될 경우,
                    검증팀은 이를 즉각 재검토하며 사실관계의 변동이 확인되면 <strong>정정 이력을 투명하게 기재하고 수정</strong>합니다.
                </p>
                <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-700/60">
                    * 정정 요청 및 근거 사료 제보는 시민 검증 의뢰소를 통해 투명하게 상시 접수됩니다.
                </div>
            </div>
        </div>
    );
}
