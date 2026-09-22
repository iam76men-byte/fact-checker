-- 반론 게시판 (rebuttals) 테이블 생성 SQL
-- Supabase 대시보드 -> SQL Editor 에서 실행해주세요.

CREATE TABLE IF NOT EXISTS public.rebuttals (
    id BIGSERIAL PRIMARY KEY,
    fact_id BIGINT REFERENCES public.facts(id) ON DELETE CASCADE,
    fact_title TEXT NOT NULL,
    fact_verdict TEXT NOT NULL,
    author_name TEXT NOT NULL DEFAULT '시민/당사자',
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- 최대 2,000자 제한
    password_hash TEXT NOT NULL, -- 비밀번호 해시
    reference_file_url TEXT, -- 참고문헌 파일 URL (최대 200KB)
    reference_file_name TEXT, -- 참고문헌 파일명
    reference_file_size INT, -- 참고문헌 파일 크기 (바이트)
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE, -- 소프트 딜리트 플래그
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.rebuttals ENABLE ROW LEVEL SECURITY;

-- 삭제되지 않은 반론은 누구나 조회 가능
CREATE POLICY "Allow public read active rebuttals"
ON public.rebuttals FOR SELECT
USING (is_deleted = FALSE);

-- 누구나 신규 반론 등록 가능
CREATE POLICY "Allow public insert rebuttals"
ON public.rebuttals FOR INSERT
WITH CHECK (true);

-- 수정 및 소프트 딜리트 업데이트 허용
CREATE POLICY "Allow public update rebuttals"
ON public.rebuttals FOR UPDATE
USING (true);
