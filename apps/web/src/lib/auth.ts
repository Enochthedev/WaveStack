import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authApi } from "@/lib/api";

// Augment next-auth types to carry our backend token
declare module "next-auth" {
  interface User {
    orgId?: string;
    accessToken?: string;
    refreshToken?: string;
  }
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      orgId?: string;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await authApi.login(
            credentials.email as string,
            credentials.password as string,
          );
          return {
            id: res.user.id,
            name: res.user.name,
            email: res.user.email,
            orgId: res.user.orgId,
            accessToken: res.token,
            refreshToken: res.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.orgId = user.orgId;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session({ session, token }: { session: any; token: any }) {
      session.user.id = token.sub ?? "";
      session.user.orgId = token.orgId as string | undefined;
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
      return session;
    },
  },
});
