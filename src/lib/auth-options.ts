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
    const user = await prisma.user.findUnique({ where: { email: credentials.email } });
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(credentials.password, user.passwordHash);
    return valid ? { id: user.id, email: user.email, name: user.name } : null;
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
    async jwt({ token, user }) { if (user) token.userId = user.id; return token; },
    async session({ session, token }) { if (session.user) (session.user as any).id = token.userId; return session; },
  },
};