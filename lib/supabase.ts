import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfohsefbkdbzqbeoolsa.supabase.co';
const supabaseAnonKey = 'sb_publishable_mL8KPUhPDadEeRKJk__B-g_eM2Y02Y-';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL 또는 KEY)가 설정되지 않았습니다.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);