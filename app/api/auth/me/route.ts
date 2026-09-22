import { NextResponse } from 'next/server';
import { getServerNaverUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getServerNaverUser();

        if (!user) {
            return NextResponse.json({
                loggedIn: false,
                user: null,
            });
        }

        return NextResponse.json({
            loggedIn: true,
            user,
        });
    } catch (err: any) {
        return NextResponse.json(
            { loggedIn: false, error: err.message },
            { status: 500 }
        );
    }
}
