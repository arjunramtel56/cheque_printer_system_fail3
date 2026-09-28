import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Explicit secret: Auth.js v5 resolves AUTH_SECRET from the environment,
  // but resolving it implicitly can surface as a generic 500 ("problem with
  // the server configuration") on hosts where the variable is missing.
  // Declaring it here makes the requirement loud and diagnostic.
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Brute-force protection: max 10 failed sign-in attempts per
        // email+IP pair per 10 minutes.
        const ip =
          (request as Request | undefined)?.headers?.get("x-forwarded-for")?.split(",")[0].trim() ??
          "local";
        if (isRateLimited(`login:${credentials.email}:${ip}`, 10, 10 * 60 * 1000)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { subscription: { include: { plan: true } } },
        });

        if (!user) return null;
        if (user.status === "SUSPENDED" || user.status === "EXPIRED") return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);

        if (!isValid) return null;

        // Check trial expiry for TRIAL_USER role
        let trialExpired = false;
        if (user.role === "TRIAL_USER" && user.trialExpires) {
          if (new Date(user.trialExpires) < new Date()) {
            trialExpired = true;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          trialExpired,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/en/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.id = user.id;
        token.trialExpired = (user as any).trialExpired ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
        (session.user as any).id = token.id;
        (session.user as any).trialExpired = token.trialExpired ?? false;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});
