import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Mock auth — replace with real API call to core-app
        if (credentials?.email && credentials?.password) {
          return {
            id: "user-1",
            name: "Creator",
            email: credentials.email as string,
            orgId: "org-1",
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.orgId = (user as { orgId?: string }).orgId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session as { user: { orgId?: string } }).user.orgId =
          token.orgId as string;
      }
      return session;
    },
  },
});
