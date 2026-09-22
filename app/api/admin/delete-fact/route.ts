import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
    try {
        const { id, adminKey } = await req.json();

        const validAdminKey = process.env.ADMIN_PASSWORD || 'factrepo2026!';

        if (!adminKey || adminKey !== validAdminKey) {
            return NextResponse.json(
                { error: '관리자 인증 암호가 올바르지 않습니다.' },
                { status: 401 }
            );
        }

        if (!id) {
            return NextResponse.json({ error: '삭제할 팩트 ID가 필요합니다.' }, { status: 400 });
        }

        // select()를 붙여 실제 삭제된 행을 반환받아 검증
        const { data, error } = await supabase
            .from('facts')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: '삭제 대상이 없거나 Supabase RLS 정책으로 인해 삭제 권한이 차단되었습니다.' },
                { status: 403 }
            );
        }

        return NextResponse.json({ success: true, deleted: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}