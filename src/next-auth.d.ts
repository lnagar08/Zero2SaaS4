// next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * 'session' 
   */
  interface Session {
    user: {
      role?: string;
      orgId?: string;
    } & DefaultSession["user"]
  }

  /**
   * 'user' 
   */
  interface User {
    role?: string;
    orgId?: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * JWT 
   */
  interface JWT {
    role?: string;
    orgId?: string;
  }
}
