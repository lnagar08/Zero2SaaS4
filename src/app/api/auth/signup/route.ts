import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
export async function POST(req: NextRequest) {
  try {
    const { firmName, name, email, password, token } = await req.json();
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (!token && !firmName) {
      return NextResponse.json({ error: "Firm name is required for new accounts" }, { status: 400 });
    }

    if (password.length < 8) return NextResponse.json({ error: "Password must be 8+ characters" }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    // 2. Transaction Logic
    const result = await prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(password, 12);

      if (token) {
        // --- CASE A: INVITED USER (Joining existing Org) ---
        const invitation = await tx.invitation.findUnique({ where: { token } });
        
        if (!invitation || new Date(invitation.expiresAt) < new Date()) {
          throw new Error("Invalid or expired invitation token");
        }

        const user = await tx.user.create({
          data: {
            orgId: invitation.orgId, // Join existing org
            email: email.toLowerCase(), // Use email from invite
            name,
            passwordHash,
            role: invitation.role || "MEMBER", // Assign role from invite
            permissions: invitation.permissions || {} // Assign permissions from invite
          }
        });

        // Delete invite after success
        await tx.invitation.delete({ where: { id: invitation.id } });
        
        return { orgId: user.orgId, user };

      } else {
        // --- CASE B: NEW SIGNUP (Creating new Org) ---
        const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
        
        const org = await tx.organization.create({ data: { name: firmName, slug } });
        
        const user = await tx.user.create({
          data: {
            orgId: org.id,
            email: email.toLowerCase(),
            name,
            passwordHash,
            role: "OWNER"
          }
        });

        await tx.flowControl.create({ data: { orgId: org.id } });
        
        return { orgId: org.id, user, org };
      }
    });

    return NextResponse.json({ success: true, orgId: result.orgId  });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}