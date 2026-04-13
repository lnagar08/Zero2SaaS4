import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
//import { resend } from "@/lib/resend";
import { getServerSession } from "next-auth"; // Assuming you use NextAuth
import { authOptions } from "@/lib/auth-options";
import { getCurrentOrg } from "@/lib/tenant";

export async function GET() {
  const t = await getCurrentOrg();
  const invites = await prisma.invitation.findMany({ where: { orgId: t.orgId, status: "pending" }, select: { id: true, email: true, role: true, createdAt: true } });
  return NextResponse.json(invites.map(i => ({
    ...i,
    sentAt: i.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  })));
}

export async function POST(req: Request) {
  try {
    const { orgId } = await getCurrentOrg();
    // 1. Authenticate and check if the user is an OWNER
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized. Only owners can invite." }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is missing." }, { status: 400 });
    }

    const { email, role } = await req.json();

    // 2. Validate input
    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
    }

    // 3. Check if user already exists in the organization
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User is already a member." }, { status: 400 });
    }

    const existingInvitation = await prisma.invitation.findFirst({ where: { email } });
    if (existingInvitation) {
      return NextResponse.json({ error: "Invitation already sent." }, { status: 400 });
    }

    // 4. Generate a unique secure token and expiry (24 hours)
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 5. Save invitation to the database
    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        orgId: orgId, // Link to the owner's organization
        expiresAt,
        status: "pending",
      },
    });

    // 6. Construct the signup link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?token=${token}`;

    // 7. Send the email via Resend
    /*await resend.emails.send({
      from: "Team <onboarding@yourdomain.com>",
      to: email,
      subject: "You've been invited to join the team",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Join your team</h2>
          <p>You have been invited as an <strong>${role}</strong>.</p>
          <p>Click the button below to set up your account:</p>
          <a href="${inviteLink}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This link will expire in 24 hours.
          </p>
        </div>
      `,
    });*/

    return NextResponse.json({ 
      success: true, 
      message: `Invitation sent to ${email}`,
      invitation: {
        ...invitation, sentAt: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }) 
        } 
    });

  } catch (error) {
    console.error("INVITE_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
