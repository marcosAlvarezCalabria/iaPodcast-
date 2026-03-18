import { NextResponse } from "next/server";
import { TAGS } from "@/src/lib/tags/data";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({ tags: TAGS });
}
