import { compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUsersCollection } from "@/lib/mongodb";

const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function getDisplayName(user) {
  return user?.display_name || user?.name || user?.username || "Teacher";
}

function getPasswordHash(user) {
  return user?.password_hash || user?.passwordHash || "";
}

function getClientIp(request) {
  const forwardedFor = request?.headers?.["x-forwarded-for"] || request?.headers?.get?.("x-forwarded-for");
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return request?.socket?.remoteAddress || request?.ip || "unknown";
}

function rateLimitKey(username, request) {
  return `${getClientIp(request)}:${username || "missing"}`;
}

function checkLoginRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }

  if (record.count >= LOGIN_MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

function clearLoginRateLimit(key) {
  loginAttempts.delete(key);
}

async function findTeacherByUsername(username) {
  const usersCollection = await getUsersCollection();
  return usersCollection.findOne({ username });
}

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const username = normalizeUsername(credentials?.username);
        const password = String(credentials?.password || "");
        const limitKey = rateLimitKey(username, request);

        if (!checkLoginRateLimit(limitKey)) {
          throw new Error("Invalid username or password");
        }

        if (!username || !password) {
          throw new Error("Invalid username or password");
        }

        const user = await findTeacherByUsername(username);
        const passwordHash = getPasswordHash(user);

        if (user?.role !== "teacher" || !passwordHash) {
          throw new Error("Invalid username or password");
        }

        const isValid = await compare(password, passwordHash);
        if (!isValid) {
          throw new Error("Invalid username or password");
        }

        clearLoginRateLimit(limitKey);
        return {
          id: String(user._id),
          username: user.username,
          name: getDisplayName(user),
          image: user.profileImageSrc || null,
          role: "teacher",
          mustChangePassword: Boolean(user.must_change_password),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username || token.username;
        token.role = user.role || token.role;
        token.name = user.name || token.name;
        token.image = user.image || token.image || null;
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }

      const username = normalizeUsername(token.username);
      if (username) {
        const dbUser = await findTeacherByUsername(username);

        if (dbUser) {
          token.sub = String(dbUser._id);
          token.username = dbUser.username;
          token.role = dbUser.role || null;
          token.name = getDisplayName(dbUser);
          token.image = dbUser.profileImageSrc || token.image || null;
          token.mustChangePassword = Boolean(dbUser.must_change_password);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.username = token.username || null;
        session.user.role = token.role || null;
        session.user.name = token.name || session.user.name;
        session.user.image = token.image || null;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const authHandler = NextAuth(authOptions);

export function auth() {
  return getServerSession(authOptions);
}

export async function requireUserSession() {
  const session = await auth();
  return session?.user ? session : null;
}

export async function isTeacherRequest({ allowPasswordChange = false } = {}) {
  const session = await auth();
  return (
    session?.user?.role === "teacher" &&
    (allowPasswordChange || !session.user.mustChangePassword)
  );
}
