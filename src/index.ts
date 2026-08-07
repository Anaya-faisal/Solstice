import fs from "node:fs";
import path from "node:path";
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { verifyDatabaseConnection } from "./db/index.js";

dotenv.config();

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});

// Load event files dynamically
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of eventFiles) {
	const event = require(path.join(eventsPath, file)).default;
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

verifyDatabaseConnection();

client.login(process.env.DISCORD_TOKEN);
