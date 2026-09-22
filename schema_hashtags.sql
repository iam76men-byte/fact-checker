-- facts 테이블에 hashtags (해시태그 배열) 컬럼 추가 SQL
-- Supabase 대시보드 -> SQL Editor 에서 실행해주세요.

ALTER TABLE public.facts 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}'::TEXT[];

-- 필요 시 해시태그 검색 성능을 위한 GIN 인덱스 추가 (선택사항)
CREATE INDEX IF NOT EXISTS idx_facts_hashtags ON public.facts USING GIN(hashtags);
