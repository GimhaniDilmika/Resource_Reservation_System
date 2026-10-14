import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { UnauthorizedError, ForbiddenError } from "./errors";
import { Role } from "@prisma/client";

const COOKIE_NAME = "primewave_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "primewave-resource-reservation-secret-key-32chars"
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  name: string;
  exp?: number;
}

export async function createSessionToken(payload: Omit<TokenPayload, "exp">): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError("You must be logged in to perform this action");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== Role.ADMIN) {
    throw new ForbiddenError("Administrative privileges required");
  }
  return session;
}

export { COOKIE_NAME };
