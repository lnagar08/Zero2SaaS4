import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const providers: any[] = [];
providers.push(CredentialsProvider({
  name: "Email",
  credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;
    const user = await prisma.user.findUnique({ 
      where: { email: credentials.email } });
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(credentials.password, user.passwordHash);
    const org = await prisma.organization.findUnique({ where: { id: user.orgId }, select: { isInternal: true } });
    return valid ? { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.orgId, isInternal: org?.isInternal } : null;
  },
}));
if (process.env.GOOGLE_CLIENT_ID) {
  providers.push(GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) { 
      if (user){
          token.userId = user.id; 
          token.role = user.role;
          token.orgId = user.orgId;
          token.isInternal = (user as any).isInternal; 
      } 
      return token; 
    },
    async session({ session, token }) { 
      if (session.user) {
        (session.user as any).id = token.userId;
        session.user.role = token.role as string;
        session.user.orgId = token.orgId as string;
        (session.user as any).isInternal = token.isInternal as boolean;
      }
      return session; },
  },
};