import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	serial,
	varchar,
} from "drizzle-orm/pg-core";

export const serverConfig = pgTable("server_config", {
	guildId: varchar("guild_id").primaryKey(),
	dashboardChannelId: varchar("dashboard_channel_id"),
	celebrationChannelId: varchar("celebration_channel_id"),
	modRoleId: varchar("mod_role_id"),
});

export const dashboardState = pgTable("dashboard_state", {
	guildId: varchar("guild_id")
		.primaryKey()
		.references(() => serverConfig.guildId, { onDelete: "cascade" }),
	messageId: varchar("message_id").notNull(),
});

export const birthdays = pgTable(
	"birthdays",
	{
		guildId: varchar("guild_id")
			.notNull()
			.references(() => serverConfig.guildId, { onDelete: "cascade" }),
		userId: varchar("user_id").notNull(),
		birthMonth: integer("birth_month").notNull(),
		birthDay: integer("birth_day").notNull(),
		timezone: varchar("timezone").notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.guildId, table.userId],
			name: "pk_birthdays",
		}),
		check("birth_month_range", sql`${table.birthMonth} BETWEEN 1 AND 12`),
		check("birth_day_range", sql`${table.birthDay} BETWEEN 1 AND 31`),
		index("idx_birthdays_tz_month_day").on(
			table.timezone,
			table.birthMonth,
			table.birthDay,
		),
	],
);

export const serverMessages = pgTable("server_messages", {
	id: serial("id").primaryKey(),
	guildId: varchar("guild_id")
		.notNull()
		.references(() => serverConfig.guildId, { onDelete: "cascade" }),
	messageContent: varchar("message_content").notNull(),
});
