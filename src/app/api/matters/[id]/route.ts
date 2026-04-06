// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextRequest, NextResponse } from "next/server";
import { getMatter, updateMatter, deleteMatter } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matter = getMatter(id);
    if (!matter) {
      return NextResponse.json({ error: "Matter not found" }, { status: 404 });
    }
    return NextResponse.json(matter);
  } catch (error) {
    console.error("Matter GET error:", error);
    return NextResponse.json({ error: "Failed to load matter" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const matter = updateMatter(id, body);
    return NextResponse.json(matter);
  } catch (error: any) {
    console.error("Matter PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteMatter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Matter DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete matter" }, { status: 500 });
  }
}
