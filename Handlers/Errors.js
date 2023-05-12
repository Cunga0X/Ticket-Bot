const { Client, EmbedBuilder } = require("discord.js");
const ChannelID = require("../config.js");

/**
 * @param {Client} client
 */
module.exports = async (client) => {
	const Embed = new EmbedBuilder().setColor("Red").setTimestamp();

	process.on("unhandledRejection", (reason, p) => {
		console.log(reason, p);

		const Channel = client.channels.cache.get(ChannelID.LOGS);
		if (!Channel) return;

		Channel.send({
			embeds: [
				Embed.setDescription("**Unhandled Rejection/Catch:\n\n** ```" + reason + "```")
					.setTitle(`Error Encountered`)
					.setFooter({ text: "⚠️ Anti-Crash System" }),
			],
		});
	});

	process.on("uncaughtException", (err, origin) => {
		console.log(err, origin);

		const Channel = client.channels.cache.get(ChannelID);
		if (!Channel) return;

		Channel.send({
			embeds: [
				Embed.setDescription("**Uncaught Exception/Catch:\n\n** ```" + err + "\n\n" + origin.toString() + "```")
					.setTitle(`Error Encountered`)
					.setFooter({ text: "⚠️ Anti-Crash System" }),
			],
		});
	});

	process.on("uncaughtExceptionMonitor", (err, origin) => {
		console.log(err, origin);

		const Channel = client.channels.cache.get(ChannelID);
		if (!Channel) return;

		Channel.send({
			embeds: [
				Embed.setDescription("**Uncaught Exception/Catch (MONITOR):\n\n** ```" + err + "\n\n" + origin.toString() + "```")
					.setTitle(`Error Encountered`)
					.setFooter({ text: "⚠️ Anti-Crash System" }),
			],
		});
	});
};
