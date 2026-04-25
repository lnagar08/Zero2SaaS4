import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth"; // Assuming you use NextAuth
import { authOptions } from "@/lib/auth-options";
import { getCurrentOrg } from "@/lib/tenant";
import { Resend } from 'resend';
import { TeamInvitation } from '@/emails/TeamInvitation';
import { checkInternalAccount } from "@/lib/check-internal-account";
const resend = new Resend(process.env.RESEND_API_KEY!);

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
   const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    const { data, error } = await resend.emails.send({
      from: `MatterGuardian <${process.env.SITE_MAIL_NOREPLAY}>`,
      to: [email],
      subject: `Invitation to join ${organization?.name} on MatterGuardian`,
      react: TeamInvitation({ 
        invitedByEmail: email || "Team Member", 
        role: role || "Member",
        organization: organization?.name || "MatterGuardian",
        inviteLink
      }),
    });

    if (error || !data?.id) {
      return NextResponse.json(
        { error: error?.message || "Failed to send invitation email." }, 
        { status: 400 }
      );
    }
    if (data.id) {
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
