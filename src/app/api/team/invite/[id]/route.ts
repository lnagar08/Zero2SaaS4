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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Define params as a Promise
) {
  try {

    const { id } = await params; 

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
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
      return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
    }

    // 2. Fetch the existing invitation
    const existingInvitation = await prisma.invitation.findUnique({ where: { id: id } });
    if (!existingInvitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    // 4. Generate a unique secure token and expiry (24 hours)
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 6. Construct the signup link
    const inviteLink = `${process.env.NEXTAUTH_URL}/signup?token=${token}`;

    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    
    const { data, error } = await resend.emails.send({
      from: `MatterGuardian <${process.env.SITE_MAIL_NOREPLAY}>`,
      to: [existingInvitation?.email],
      subject: `Invitation to join ${organization?.name} on MatterGuardian`,
      react: TeamInvitation({ 
        invitedByEmail: existingInvitation?.email || "Team Member", 
        role: existingInvitation?.role || "Member",
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
        // Update the invitation with the new token and expiry
        await prisma.invitation.update({
          where: { id: id },
          data: {
            token,
            expiresAt,
          },
        });
      return NextResponse.json({ 
        success: true, 
        message: `Invitation sent to ${existingInvitation.email}`,
        invitation: {
          ...existingInvitation, sentAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }) 
          } 
      });
    } else {
      
      return NextResponse.json({ error: "Failed To send application." }, { status: 400 });
    }

  } catch (error) {
    console.error("Error in resend invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE (request: Request,
  { params }: { params: Promise<{ id: string }> } // Define params as a Promise
) {
    try {

        const { id } = await params; 

        const { orgId } = await getCurrentOrg();
        // 1. Authenticate and check if the user is an OWNER
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "OWNER") {
        return NextResponse.json({ error: "Unauthorized. Only owners can delete invitations." }, { status: 401 });
        }

        if (!orgId) {
        return NextResponse.json({ error: "Organization ID is missing." }, { status: 400 });
        }

        const isInternal = await checkInternalAccount();
        const sub = await prisma.subscription.findUnique({
          where: { orgId },
        });
        if (!isInternal && (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status))) {
          return NextResponse.json({ error: "Subscription inactive. Read-only access." }, { status: 403 });
        }

        // 2. Fetch the existing invitation
        const existingInvitation = await prisma.invitation.findUnique({ where: { id: id } });
        if (!existingInvitation) {
        return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
        }

        // 3. Delete the invitation
        await prisma.invitation.delete({ where: { id: id } });

        return NextResponse.json({ success: true, message: "Invitation revoked." });
    } catch (error) {
        console.error("Error in revoke invite:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}