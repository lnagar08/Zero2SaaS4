import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth"; // Assuming you use NextAuth
import { authOptions } from "@/lib/auth-options";
import { getCurrentOrg } from "@/lib/tenant";
import { sendMail } from '@/lib/send-mail';
import { permission } from "process";
import { checkInternalAccount } from "@/lib/check-internal-account";

export async function GET() {
  const t = await getCurrentOrg();
  const invites = await prisma.invitation.findMany({ where: { orgId: t.orgId, status: "pending" }, select: { id: true, email: true, role: true, createdAt: true, expiresAt: true } });
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

    const isInternal = await checkInternalAccount();

    if (!isInternal) {
      const sub = await prisma.subscription.findUnique({
        where: { orgId },
      });
      if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
        return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
      }

      const isTrialing = sub.status === "TRIALING"; 
      if(!isTrialing){
        const plan = await prisma.plan.findUnique({ where: { stripePriceId: sub.stripePriceId } });
        if (plan?.allowTeamUser && plan.allowTeamUser <= await prisma.invitation.count({ where: { orgId } })) {
          return NextResponse.json({ error: "Team member limit reached for your subscription plan." }, { status: 403 });
        }
      }
      
    }

    const body = await req.json();
    const { email, role, permissions } = body;
    
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

    // 6. Construct the signup link
    const inviteLink = `${process.env.NEXTAUTH_URL}/signup?token=${token}`;
 
    // 7. Send the email via Resend
    const mailText = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Join Our Team</h2>
          <p>You have been invited as an <strong>${role}</strong>.</p>
          <p>Click the button below to set up your account:</p>
          <a href="${inviteLink}" style="background: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This link will expire in 24 hours.
          </p>
        </div>
      `;
    const response = await sendMail({
      email: email,
      subject: "You've been invited to join the team",
      text: mailText,
      html: mailText,
    });
    if (response?.messageId) {
      const invitation = await prisma.invitation.create({
        data: {
          email,
          role,
          token,
          orgId: orgId, // Link to the owner's organization
          permissions: permissions,
          expiresAt,
          status: "pending",
        },
      });
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
    } else {
      
      return NextResponse.json({ error: "Failed To send application." }, { status: 400 });
    }
    

  } catch (error) {
    console.error("INVITE_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
