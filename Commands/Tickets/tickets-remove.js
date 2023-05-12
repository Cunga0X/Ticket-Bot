const { Client, ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const Ticket = require("../../Models/Ticket");

module.exports = {
	name: "tickets-remove",
	description: "Delete All Ticket-Systems",
	UserPerms: ["ManageGuild"],
	category: "Moderation",
	/**
	 * @param {Client} client
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction, client, language) {
		const { guild } = interaction;
		await Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
			if (err) throw err;
			const embed = new EmbedBuilder().setColor("Yellow").setDescription(`${client.i18n.get(language, "tickets", "remove_error")}`);
			if (!data) return interaction.reply({ embeds: [embed], ephemeral: true });
			const messageid = data.MessageID;
			const channelid = data.ChannelID;
			try {
				const channel = client.channels.cache.get(channelid);
				const message = await channel.messages.fetch(messageid);
				await message.delete();
				await Ticket.deleteOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
					if (err) throw err;
				});
				await Ticket.deleteMany({ Guild: guild.id }, async (err, data) => {
					if (err) throw err;
				});
			} catch (error) {
				console.error(error);
			} finally {
				return;
			}
		});
		await Ticket.findOne({ Guild: guild.id, Ticket: "staff-ticket-message" }, async (err, data) => {
			if (err) throw err;
			const embed = new EmbedBuilder().setColor("Yellow").setDescription(`${client.i18n.get(language, "tickets", "remove_error")}`);
			if (!data) return interaction.reply({ embeds: [embed], ephemeral: true });
			const messageid = data.MessageID;
			const channelid = data.ChannelID;
			try {
				const channel = client.channels.cache.get(channelid);
				const message = await channel.messages.fetch(messageid);
				await message.delete();
				await Ticket.deleteMany({ Guild: guild.id, Ticket: { $nin: ["support-ticket-manager", "staff-ticket-manager"] } }, async (err, data) => {
					if (err) throw err;
				});
				const embed = new EmbedBuilder().setColor("Green").setDescription(`${client.i18n.get(language, "tickets", "remove_success")}`);
				const m = await interaction.reply({ embeds: [embed], ephemeral: true });
				setTimeout(() => {
					m.delete();
				}, 3000);
			} catch (error) {
				console.error(error);
			} finally {
				return;
			}
		});
	},
};
