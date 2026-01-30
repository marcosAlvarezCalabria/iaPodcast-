import { NextResponse } from "next/server";

export const runtime = "edge";

export const GET = () => {
  return NextResponse.json({ status: "ok" });
};
