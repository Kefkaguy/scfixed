import { cookies } from "next/headers";

const CLASS_COOKIE = "schoolproj_class";

function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function readJsonCookie(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function getClassSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(CLASS_COOKIE)?.value;
  return readJsonCookie(value);
}

export async function setClassSession(data) {
  const cookieStore = await cookies();
  cookieStore.set(
    CLASS_COOKIE,
    JSON.stringify({
      setAt: new Date().toISOString(),
      ...data,
    }),
    cookieOptions(60 * 60 * 24 * 30)
  );
}

export async function clearClassSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CLASS_COOKIE);
}
