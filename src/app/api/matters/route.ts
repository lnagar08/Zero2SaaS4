// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatters, createMatter } from "@/lib/data";

export async function GET() {
  try {
    const matters = await getMatters();
    return NextResponse.json(matters);
  } catch (error) {
    console.error("Matters GET error:", error);
    return NextResponse.json({ error: "Failed to load matters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const matter = await createMatter(body);
    return NextResponse.json(matter, { status: 201 });
  } catch (error: any) {
    console.error("Matters POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create matter" }, { status: 400 });
  }
}
