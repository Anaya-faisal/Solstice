import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const guildsTable = pgTable('guilds', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});