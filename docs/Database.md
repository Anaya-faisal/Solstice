# Solstice Database Overview

This document provides an overview of the Solstice (birthday bot) database: schema, connection setup, query layer, constraints, and migrations.

---

## 1. Stack

- **Database:** PostgreSQL
- **ORM:** Drizzle
- **Migration tool:** `drizzle-kit`

---

## 2. Schema

### `server_config`
One row per Discord server. Created by `/birthday-setup`. Every other table depends on a row existing here first.

| Column | Type | Notes |
|---|---|---|
| `guild_id` | varchar, PK | Discord guild snowflake |
| `dashboard_channel_id` | varchar | Where the dashboard message lives |
| `celebration_channel_id` | varchar | Where the birthday ping posts |
| `mod_role_id` | varchar | Role allowed to run `/birthday-admin` |

### `dashboard_state`
One row per server. Tracks the single persistent dashboard message so it's edited in place, never reposted.

| Column | Type | Notes |
|---|---|---|
| `guild_id` | varchar, PK, FK → `server_config.guild_id` | One-to-one with `server_config` |
| `message_id` | varchar, not null | Message the bot edits on every update |

### `birthdays`
One row per member per server. Core data of the bot. No `birth_year` column, deliberately — only month/day are ever stored, minimizing personal data on file.

| Column | Type | Notes |
|---|---|---|
| `guild_id` | varchar, FK → `server_config.guild_id` | |
| `user_id` | varchar, not null | Discord user snowflake |
| `birth_month` | int, not null | 1–12, `CHECK` constrained |
| `birth_day` | int, not null | 1–31, `CHECK` constrained |
| `timezone` | varchar, not null | IANA name e.g. `Asia/Dubai` — never a raw offset (breaks on DST) |

Primary key: composite `(guild_id, user_id)` no surrogate ID, so a duplicate row for the same user is rejected at the DB level.

### `server_messages`
Multiple rows per server. Custom celebration templates set via `/birthday-message`; one is picked at random at send time.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | Auto-incrementing |
| `guild_id` | varchar, FK → `server_config.guild_id` | |
| `message_content` | varchar, not null | e.g. `"🎉 Happy birthday {user}!..."` |

---

## 3. Entity Relationship Diagram

```
+-------------------------+          +-------------------------+
|      server_config      |          |      dashboard_state    |
+-------------------------+          +-------------------------+
| guild_id (PK)           |<---------| guild_id (PK, FK)       |
| dashboard_channel_id    |          | message_id               |
| celebration_channel_id  |          +-------------------------+
| mod_role_id             |
+-------------------------+
        ^           ^
        |           |
        |           +----------------------------+
        |                                         |
+-------------------------+          +-------------------------+
|        birthdays        |          |     server_messages     |
+-------------------------+          +-------------------------+
| guild_id (FK)           |          | id (PK)                  |
| user_id                 |          | guild_id (FK)             |
| birth_month              |          | message_content           |
| birth_day                 |          +-------------------------+
| timezone                 |
| PK: (guild_id, user_id) |
+-------------------------+
```

All foreign keys are `ON DELETE CASCADE` — removing a server's config row cleans up its dashboard state, birthdays, and message templates automatically.

---
## 5. Query Layer — Function Signatures

### Birthdays.ts
```ts
function getBirthdaysForGuild(guildId: string): Promise<Birthday[]>
  // All birthday rows for a server, unsorted.

function upsertBirthday(guildId: string, userId: string, month: number, day: number, timezone: string): Promise<void>
  // Insert or update a user's birthday. Relies on the (guild_id, user_id) primary key to prevent duplicates.

function deleteBirthday(guildId: string, userId: string): Promise<void>
  // Removes a single user's birthday record.

function deleteAllBirthdaysForUser(userId: string): Promise<void>
  // Used by the guildMemberRemove listener — clears a user's row(s) across guilds on leave/kick/ban.
```
### ServerConfig.ts
```ts
function getServerConfig(guildId: string): Promise<ServerConfig | null>
  // Fetch a server's channel/role settings. Null if /birthday-setup hasn't run yet.

function upsertServerConfig(guildId: string, config: Partial<ServerConfig>): Promise<void>
  // Called by /birthday-setup — creates or updates the config row.
```
### ServerMessages.ts
```ts
function getRandomMessageTemplate(guildId: string): Promise<string>
  // Picks one template at random; falls back to a hardcoded default if none exist.

function addMessageTemplate(guildId: string, content: string): Promise<void>
  // Called by /birthday-message to add a new template.
```

---


### Indexing strategy

The per-timezone cron job queries `birthdays` scoped to one timezone, then filtered by today's month/day: `WHERE timezone = X AND birth_month = M AND birth_day = D`. Add a composite index in that column order so Postgres can narrow by the most selective filter first:

```sql
CREATE INDEX idx_birthdays_tz_month_day ON birthdays (timezone, birth_month, birth_day);
```
---
