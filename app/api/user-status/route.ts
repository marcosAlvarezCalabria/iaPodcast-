import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const usageCookie = cookieStore.get("podcast_usage");
    const usage = usageCookie ? parseInt(usageCookie.value) : 0;

    return NextResponse.json({
        usage,
        limit: 4,
        remaining: Math.max(0, 4 - usage)
    });
}
