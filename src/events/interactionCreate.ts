import { Events, type Interaction } from "discord.js";

export default {
	name: Events.InteractionCreate,
	async execute(interaction: Interaction) {
		if (!interaction.isChatInputCommand()) return;
		console.log(`[Command] ${interaction.commandName} invoked.`);
	},
};
