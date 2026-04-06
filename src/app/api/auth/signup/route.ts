import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
export async function POST(req: NextRequest) {
  try {
    const { firmName, name, email, password } = await req.json();
    if (!firmName || !name || !email || !password) return NextResponse.json({ error: "All fields required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be 8+ characters" }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: firmName, slug } });
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await tx.user.create({ data: { orgId: org.id, email: email.toLowerCase(), name, passwordHash, role: "OWNER" } });
      await tx.flowControl.create({ data: { orgId: org.id } });
      return { org, user };
    });
    return NextResponse.json({ success: true, orgId: result.org.id });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}