import { createNeonAuth } from "@neondatabase/auth/next/server";

/** Server-side Neon Auth (managed Better Auth). Secrets stay on the server. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
