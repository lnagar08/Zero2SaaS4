import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth"; // Assuming you use NextAuth
import { authOptions } from "@/lib/auth-options";
import { getCurrentOrg } from "@/lib/tenant";
import { sendMail } from '@/lib/send-mail';

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

    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
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

    const mailText = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Join Our Team</h2>
          <p>You have been invited as an <strong>${existingInvitation.role}</strong>.</p>
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
      email: existingInvitation.email,
      subject: "You've been invited to join the team",
      text: mailText,
      html: mailText,
    });

    if (response?.messageId) {
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

        const sub = await prisma.subscription.findUnique({
            where: { orgId },
        });
        if (!sub || ["PAST_DUE", "UNPAID", "CANCELED"].includes(sub.status)) {
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