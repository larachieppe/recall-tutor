import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

/**
 * Drizzle client, or `null` when DATABASE_URL is not configured. Everything
 * that touches the database checks for null and degrades to local-only mode,
 * so the app runs fine without a database.
 */
export const db = connectionString
  ? drizzle(
      new Pool({
        connectionString,
        ssl: connectionString.includes("localhost")
          ? undefined
          : { rejectUnauthorized: false },
      }),
      { schema },
    )
  : null;
