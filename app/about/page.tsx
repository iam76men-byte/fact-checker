import Link from 'next/link';
import AboutSection from '@/components/AboutSection';

export const metadata = {
    title: '서비스 소개 및 검증 방법론 | FactRepo',
    description: 'FactRepo의 운영 주체, 데이터 수집 기준, 5단계 팩트체크 검증 방법론 및 비당파성 운영 원칙을 안내합니다.',
};

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* 상단 네비게이션 */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                    <Link
                        href="/"
                        className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition"
                    >
                        <span>&larr;</span>
                        <span>메인 팩트체크 아카이브로 돌아가기</span>
                    </Link>
                    <span className="text-[11px] text-neutral-500 font-mono">FactRepo About</span>
                </div>

                <AboutSection />

                {/* 하단 푸터 */}
                <footer className="border-t border-neutral-800 pt-6 pb-12 text-center text-xs text-neutral-500">
                    <p>© 2026 FactRepo. 공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브</p>
                    <p className="mt-1 text-[11px] text-neutral-600">
                        본 플랫폼은 특정 정파 및 이익 집단으로부터 독립된 비영리 시민 참여형 아카이브입니다.
                    </p>
                </footer>
            </div>
        </main>
    );
}
