import { neon } from "@neondatabase/serverless";

/** Server-only Postgres client (DATABASE_URL never reaches the browser). */
export const sql = neon(process.env.DATABASE_URL!);
