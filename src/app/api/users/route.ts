// TODO: Add tenant scoping — const { orgId } = await getCurrentOrg();
import { NextResponse } from "next/server";
import { getUsers, ensureDefaultUser } from "@/lib/data";

export async function GET() {
  try {
    await ensureDefaultUser();
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
