// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextResponse } from "next/server";
import { getUsers, ensureDefaultUser } from "@/lib/data";

export async function GET() {
  try {
    ensureDefaultUser();
    const users = getUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
