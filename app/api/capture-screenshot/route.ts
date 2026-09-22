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

        let finalBuffer: Buffer | null = null;
        let finalContentType = 'image/png';

        // 1차 시도: Microlink 고화질 웹 캡처 엔진 (타임아웃 12초)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const microlinkEndpoint = `https://api.microlink.io?url=${encodeURIComponent(trimmedUrl)}&screenshot=true&meta=false`;
            const microRes = await fetch(microlinkEndpoint, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (microRes.ok) {
                const microData = await microRes.json();
                const screenshotUrl = microData?.data?.screenshot?.url;
                if (screenshotUrl) {
                    const imgRes = await fetch(screenshotUrl);
                    if (imgRes.ok) {
                        const arrayBuffer = await imgRes.arrayBuffer();
                        const buf = Buffer.from(arrayBuffer);
                        if (buf.length > 20000 && !buf.toString('utf-8', 0, 6).startsWith('GIF89a')) {
                            finalBuffer = buf;
                            finalContentType = 'image/png';
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Microlink capture notice:', e);
        }

        // 2차 시도: WordPress mshots (로딩 스피너 GIF89a 필터링 및 완성 대기 폴링)
        if (!finalBuffer) {
            const mshotsUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(trimmedUrl)}?w=1280`;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const res = await fetch(mshotsUrl);
                    if (res.ok) {
                        const arrayBuffer = await res.arrayBuffer();
                        const buf = Buffer.from(arrayBuffer);
                        const header = buf.toString('utf-8', 0, 6);

                        // GIF89a(로딩 중 스피너)가 아니고 유의미한 크기(>20KB)인 실제 스크린샷인 경우
                        if (!header.startsWith('GIF89a') && buf.length > 20000) {
                            finalBuffer = buf;
                            finalContentType = res.headers.get('content-type') || 'image/jpeg';
                            break;
                        }
                    }
                } catch (err) {
                    console.warn(`mshots attempt ${attempt} failed:`, err);
                }
                // 아직 렌더링 중이면 2초 대기 후 재시도
                if (attempt < 3) {
                    await new Promise((r) => setTimeout(r, 2000));
                }
            }
        }

        // 3차 시도: 웹페이지 메타태그(og:image)에서 대표 기사 이미지 추출 (Fallback 안전망)
        if (!finalBuffer) {
            try {
                const pageRes = await fetch(trimmedUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });
                if (pageRes.ok) {
                    const html = await pageRes.text();
                    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                                    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
                    if (ogMatch && ogMatch[1]) {
                        let ogImageUrl = ogMatch[1];
                        if (ogImageUrl.startsWith('//')) ogImageUrl = 'https:' + ogImageUrl;
                        const ogRes = await fetch(ogImageUrl);
                        if (ogRes.ok) {
                            const arrayBuffer = await ogRes.arrayBuffer();
                            finalBuffer = Buffer.from(arrayBuffer);
                            finalContentType = ogRes.headers.get('content-type') || 'image/jpeg';
                        }
                    }
                }
            } catch (ogErr) {
                console.warn('og:image fallback error:', ogErr);
            }
        }

        // Supabase Storage에 영구 보존(박제) 업로드
        if (finalBuffer && finalBuffer.length > 10000) {
            const ext = finalContentType.includes('png') ? 'png' : 'jpg';
            const fileName = `capture_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('fact_images')
                .upload(filePath, finalBuffer, {
                    contentType: finalContentType,
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
                console.warn('Supabase storage upload error:', uploadError.message);
            }
        }

        // 스토리지에 업로드할 수 없는 경우에도 스크린샷 서비스 URL 제공
        const fallbackUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(trimmedUrl)}?w=1280`;
        return NextResponse.json({
            success: true,
            imageUrl: fallbackUrl,
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
