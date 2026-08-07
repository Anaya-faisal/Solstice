import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is missing.");
}

const client = postgres(process.env.DATABASE_URL, {
	max: 10, // max concurrent connections
	idle_timeout: 30, // seconds
	connect_timeout: 5, // seconds
});

export const db = drizzle(client, { schema });

export async function verifyDatabaseConnection(retries = 3, delayMs = 1000) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await client`SELECT 1`;
			return;
		} catch (err) {
			if (attempt === retries) {
				throw new Error(
					`Could not connect to database after ${retries} attempts: ${err}`,
				);
			}
			await new Promise((r) => setTimeout(r, delayMs));
		}
	}
}
