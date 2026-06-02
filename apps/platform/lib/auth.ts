import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@datalens/db';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60, updateAge: 3600 },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: { select: { isActive: true } } },
        });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          tenantId: user.tenantId,
          tenantIsActive: user.tenant.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.tenantId = user.tenantId;
        token.tenantIsActive = user.tenantIsActive;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.tenantId = token.tenantId;
        session.user.tenantIsActive = token.tenantIsActive;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireRole(roles: Array<'BASIC_USER' | 'MANAGER' | 'DB_ADMIN'>) {
  const session = await getAuthSession();
  if (!session?.user?.tenantId) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!roles.includes(session.user.role as 'BASIC_USER' | 'MANAGER' | 'DB_ADMIN')) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, response: null };
}