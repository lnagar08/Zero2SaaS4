import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // 1. Find the invitation by token
  const invitation = await prisma.invitation.findUnique({
    where: { token: token },
  });

  // 2. Check if invitation exists
  if (!invitation) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  // 3. Check if current time is greater than expiresAt
  const isExpired = new Date(invitation.expiresAt) < new Date();
  
  if (isExpired) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  // 4. Return success and the email associated with the token
  return NextResponse.json({ 
    message: "Token is valid", 
    email: invitation.email 
  });
}
