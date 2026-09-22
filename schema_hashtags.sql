-- 1. facts 테이블에 hashtags (해시태그 배열) 컬럼 추가
ALTER TABLE public.facts 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}'::TEXT[];

-- 2. 관리자 팩트 리포트 정정(UPDATE)을 위한 RLS 정책 추가 (핵심: 이게 없으면 수정이 무시됩니다!)
DROP POLICY IF EXISTS "Allow public update facts" ON public.facts;
CREATE POLICY "Allow public update facts"
ON public.facts FOR UPDATE
USING (true)
WITH CHECK (true);

-- 3. 관리자 팩트 리포트 삭제(DELETE)를 위한 RLS 정책 확인 및 추가
DROP POLICY IF EXISTS "Allow public delete facts" ON public.facts;
CREATE POLICY "Allow public delete facts"
ON public.facts FOR DELETE
USING (true);

-- 4. 해시태그 검색 성능을 위한 GIN 인덱스 추가 (선택사항)
CREATE INDEX IF NOT EXISTS idx_facts_hashtags ON public.facts USING GIN(hashtags);

-- 5. 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';

