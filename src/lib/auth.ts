import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { prisma } from "./prisma";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

async function getUserFromDb(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hash(password, 10);
  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || email.split("@")[0],
    },
  });
}

export const authConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
        isSignUp: { label: "Sign Up", type: "hidden", value: "false" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const parsedCredentials = signInSchema.safeParse(credentials);
        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        // Check if this is a sign-up attempt
        if (credentials.isSignUp === "true") {
          const existingUser = await getUserFromDb(email);
          if (existingUser) {
            throw new Error("User already exists");
          }
          const newUser = await createUser(email, password, credentials.name as string);
          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          };
        }

        // Sign in attempt
        const user = await getUserFromDb(email);
        if (!user) {
          return null;
        }

        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
