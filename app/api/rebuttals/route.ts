import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// 비밀번호 SHA-256 해시 헬퍼
function hashPassword(pwd: string): string {
    return crypto.createHash('sha256').update(pwd.trim()).digest('hex');
}

// 팩트 판정 라벨 추출기
function extractVerdictLabel(factSummary?: string | null): string {
    if (!factSummary) return '검증 완료';
    if (/대체로\s*사실\s*아님/i.test(factSummary)) return '대체로 사실 아님';
    if (/사실\s*아님/i.test(factSummary)) return '사실 아님';
    if (/절반의\s*사실/i.test(factSummary)) return '절반의 사실';
    if (/대체로\s*사실/i.test(factSummary)) return '대체로 사실';
    if (/(^|[^\w가-힣])사실([^\w가-힣]|$)/i.test(factSummary)) return '사실';
    return '검증 완료';
}

// 1. 반론 목록 조회 (GET)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const factId = searchParams.get('factId');

        let query = supabase
            .from('rebuttals')
            .select('*, facts(id, title, fact_summary)')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (factId) {
            query = query.eq('fact_id', Number(factId));
        }

        const { data, error } = await query;

        if (error) {
            // 테이블 자체가 아직 없는 경우에만 안내 반환
            const isTableMissing =
                error.code === 'PGRST205' ||
                error.code === '42P01' ||
                (error.message && error.message.includes('relation "public.rebuttals" does not exist'));

            if (isTableMissing) {
                return NextResponse.json({
                    needsTableSetup: true,
                    rebuttals: [],
                    message: 'rebuttals 테이블 생성이 필요합니다. schema_rebuttals.sql을 Supabase SQL Editor에서 실행해주세요.',
                });
            }
            throw error;
        }

        const formatted = (data || []).map((row: any) => {
            const fact = row.facts || {};
            return {
                id: row.id,
                fact_id: row.fact_id,
                fact_title: row.fact_title || fact.title || '검증 안건',
                fact_verdict: row.fact_verdict || extractVerdictLabel(fact.fact_summary),
                author_name: row.author_name,
                title: row.title,
                content: row.content,
                reference_file_url: row.reference_file_url,
                reference_file_name: row.reference_file_name,
                reference_file_size: row.reference_file_size,
                created_at: row.created_at,
                updated_at: row.updated_at,
            };
        });

        return NextResponse.json({
            rebuttals: formatted,
        });
    } catch (err: any) {
        console.error('GET /api/rebuttals error:', err);
        return NextResponse.json(
            { error: '반론 목록을 불러오지 못했습니다: ' + err.message },
            { status: 500 }
        );
    }
}

// 2. 신규 반론 등록 (POST)
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const factId = formData.get('fact_id') as string;
        const factTitle = formData.get('fact_title') as string;
        const factVerdict = formData.get('fact_verdict') as string;
        const authorName = (formData.get('author_name') as string) || '시민/당사자';
        const title = formData.get('title') as string;
        const content = formData.get('content') as string;
        const password = formData.get('password') as string;
        const file = formData.get('reference_file') as File | null;

        if (!factId || !title?.trim() || !content?.trim() || !password?.trim()) {
            return NextResponse.json(
                { error: '대상 팩트, 반론 제목, 내용 및 비밀번호는 필수 입력 항목입니다.' },
                { status: 400 }
            );
        }

        // 글자 수 제한 검증 (최대 2,000자)
        if (content.trim().length > 2000) {
            return NextResponse.json(
                { error: '반론 내용은 최대 2,000자까지 작성 가능합니다.' },
                { status: 400 }
            );
        }

        // 비밀번호 자릿수 검증
        if (password.trim().length < 4) {
            return NextResponse.json(
                { error: '비밀번호는 4자리 이상 입력해주세요.' },
                { status: 400 }
            );
        }

        let referenceFileUrl: string | null = null;
        let referenceFileName: string | null = null;
        let referenceFileSize: number | null = null;

        // 참고문헌 파일 검증 및 업로드 (최대 200KB = 204,800 bytes)
        if (file && file.size > 0) {
            const MAX_FILE_SIZE = 200 * 1024; // 200KB
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: `참고문헌 파일 크기는 최대 200KB 이하여야 합니다. (현재: ${(file.size / 1024).toFixed(1)}KB)` },
                    { status: 400 }
                );
            }

            referenceFileName = file.name;
            referenceFileSize = file.size;

            const fileExt = file.name.split('.').pop() || 'dat';
            const storagePath = `references/ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { error: uploadError } = await supabase.storage
                .from('fact_images')
                .upload(storagePath, buffer, {
                    contentType: file.type || 'application/octet-stream',
                    upsert: false,
                });

            if (!uploadError) {
                const { data: publicData } = supabase.storage
                    .from('fact_images')
                    .getPublicUrl(storagePath);

                referenceFileUrl = publicData?.publicUrl || null;
            } else {
                console.warn('Reference file upload warning:', uploadError.message);
            }
        }

        const passwordHash = hashPassword(password);

        const insertPayload: any = {
            fact_id: Number(factId),
            author_name: authorName.trim(),
            title: title.trim(),
            content: content.trim(),
            password_hash: passwordHash,
            reference_file_url: referenceFileUrl,
            reference_file_name: referenceFileName,
            reference_file_size: referenceFileSize,
            is_deleted: false,
        };

        const { data, error } = await supabase
            .from('rebuttals')
            .insert([insertPayload])
            .select('*, facts(id, title, fact_summary)')
            .single();

        if (error) {
            throw error;
        }

        const formatted = {
            id: data.id,
            fact_id: data.fact_id,
            fact_title: data.fact_title || data.facts?.title || factTitle || '선택된 팩트',
            fact_verdict: data.fact_verdict || extractVerdictLabel(data.facts?.fact_summary) || factVerdict || '검증 안건',
            author_name: data.author_name,
            title: data.title,
            content: data.content,
            reference_file_url: data.reference_file_url,
            reference_file_name: data.reference_file_name,
            reference_file_size: data.reference_file_size,
            created_at: data.created_at,
        };

        return NextResponse.json({
            success: true,
            rebuttal: formatted,
        });
    } catch (err: any) {
        console.error('POST /api/rebuttals error:', err);
        return NextResponse.json(
            { error: '반론 등록 실패: ' + err.message },
            { status: 500 }
        );
    }
}

// 3. 반론 정정(수정) (PUT)
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, password, title, content } = body;

        if (!id || !password || !title?.trim() || !content?.trim()) {
            return NextResponse.json(
                { error: '게시물 ID, 비밀번호, 제목, 내용은 필수입니다.' },
                { status: 400 }
            );
        }

        if (content.trim().length > 2000) {
            return NextResponse.json(
                { error: '반론 내용은 최대 2,000자까지 작성 가능합니다.' },
                { status: 400 }
            );
        }

        // 비밀번호 대조
        const { data: existing, error: findError } = await supabase
            .from('rebuttals')
            .select('id, password_hash, is_deleted')
            .eq('id', id)
            .single();

        if (findError || !existing || existing.is_deleted) {
            return NextResponse.json({ error: '수정할 반론 게시물을 찾을 수 없습니다.' }, { status: 404 });
        }

        const inputHash = hashPassword(password);
        if (existing.password_hash !== inputHash) {
            return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
        }

        const { data, error: updateError } = await supabase
            .from('rebuttals')
            .update({
                title: title.trim(),
                content: content.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('*, facts(id, title, fact_summary)')
            .single();

        if (updateError) throw updateError;

        const formatted = {
            id: data.id,
            fact_id: data.fact_id,
            fact_title: data.fact_title || data.facts?.title || '선택된 팩트',
            fact_verdict: data.fact_verdict || extractVerdictLabel(data.facts?.fact_summary) || '검증 안건',
            author_name: data.author_name,
            title: data.title,
            content: data.content,
            reference_file_url: data.reference_file_url,
            reference_file_name: data.reference_file_name,
            updated_at: data.updated_at,
        };

        return NextResponse.json({
            success: true,
            rebuttal: formatted,
        });
    } catch (err: any) {
        console.error('PUT /api/rebuttals error:', err);
        return NextResponse.json(
            { error: '반론 수정 실패: ' + err.message },
            { status: 500 }
        );
    }
}

// 4. 반론 삭제 (소프트 딜리트) (DELETE)
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, password } = body;

        if (!id || !password) {
            return NextResponse.json(
                { error: '게시물 ID와 비밀번호를 입력해주세요.' },
                { status: 400 }
            );
        }

        // 비밀번호 대조
        const { data: existing, error: findError } = await supabase
            .from('rebuttals')
            .select('id, password_hash, is_deleted')
            .eq('id', id)
            .single();

        if (findError || !existing || existing.is_deleted) {
            return NextResponse.json({ error: '삭제할 반론 게시물을 찾을 수 없습니다.' }, { status: 404 });
        }

        const inputHash = hashPassword(password);
        if (existing.password_hash !== inputHash) {
            return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
        }

        // 소프트 딜리트: is_deleted 플래그 설정
        const { error: deleteError } = await supabase
            .from('rebuttals')
            .update({
                is_deleted: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({
            success: true,
            message: '반론이 성공적으로 삭제되었습니다.',
        });
    } catch (err: any) {
        console.error('DELETE /api/rebuttals error:', err);
        return NextResponse.json(
            { error: '반론 삭제 실패: ' + err.message },
            { status: 500 }
        );
    }
}

