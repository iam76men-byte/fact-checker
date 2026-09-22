import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: '유효한 URL이 필요합니다.' }, { status: 400 });
        }

        const trimmedUrl = url.trim();
        try {
            new URL(trimmedUrl);
        } catch {
            return NextResponse.json({ error: '올바른 형식의 웹 링크(URL)가 아닙니다.' }, { status: 400 });
        }

        let captureImageUrl: string | null = null;

        // 1차 시도: Microlink 고화질 웹 캡처 엔진 (타임아웃 8초)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const microlinkEndpoint = `https://api.microlink.io?url=${encodeURIComponent(trimmedUrl)}&screenshot=true&meta=false`;
            const microRes = await fetch(microlinkEndpoint, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (microRes.ok) {
                const microData = await microRes.json();
                if (microData?.data?.screenshot?.url) {
                    captureImageUrl = microData.data.screenshot.url;
                }
            }
        } catch (e) {
            console.warn('Microlink capture warning, switching to fallback:', e);
        }

        // 2차 시도 (Fallback): WordPress mshots 글로벌 캡처 서비스
        if (!captureImageUrl) {
            captureImageUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(trimmedUrl)}?w=1280`;
        }

        // 캡처 이미지를 Supabase Storage에 영구 보존(박제) 시도
        try {
            const imgRes = await fetch(captureImageUrl);
            if (imgRes.ok) {
                const arrayBuffer = await imgRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const fileName = `capture_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
                const filePath = `uploads/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('fact_images')
                    .upload(filePath, buffer, {
                        contentType: 'image/png',
                        upsert: false,
                    });

                if (!uploadError) {
                    const { data: publicUrlData } = supabase.storage
                        .from('fact_images')
                        .getPublicUrl(filePath);

                    if (publicUrlData?.publicUrl) {
                        return NextResponse.json({
                            success: true,
                            imageUrl: publicUrlData.publicUrl,
                            isArchived: true,
                        });
                    }
                } else {
                    console.warn('Supabase storage upload failed, using original capture URL:', uploadError.message);
                }
            }
        } catch (storageErr) {
            console.warn('Error archiving capture to Supabase Storage:', storageErr);
        }

        // 스토리지 업로드 실패 시에도 생성된 캡처 원본 URL로 안전하게 반환
        return NextResponse.json({
            success: true,
            imageUrl: captureImageUrl,
            isArchived: false,
        });
    } catch (err: any) {
        console.error('Capture screenshot API error:', err);
        return NextResponse.json(
            { error: err.message || '스크린샷 생성 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
