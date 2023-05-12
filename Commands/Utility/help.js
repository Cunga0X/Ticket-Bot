const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { readdirSync } = require("fs");
module.exports = {
	name: "help",
	description: "Displays all commands that the bot has.",
	category: "Utility",
	permissions: {
		channel: [],
		bot: [],
		user: [],
	},
	async execute(interaction, client, language) {
		await interaction.deferReply({ ephemeral: false });

		const categories = readdirSync("./Commands");

		const embed = new EmbedBuilder().setColor("Green").setDescription(`${client.i18n.get(language, "utilities", "help_desc")}`);

		const row = new ActionRowBuilder().addComponents([
			new StringSelectMenuBuilder()
				.setCustomId("help-category")
				.setPlaceholder(`${client.i18n.get(language, "utilities", "help_desc")}`)
				.setMaxValues(1)
				.setMinValues(1)
				/// Map the categories to the select menu
				.setOptions(
					categories.map((category) => {
						return new StringSelectMenuOptionBuilder().setLabel(category).setValue(category);
					}),
				),
		]);

		interaction.editReply({ embeds: [embed], components: [row] }).then(async (msg) => {
			let filter = (i) => i.isStringSelectMenu() && i.user && i.message.author.id == client.user.id;
			let collector = await msg.createMessageComponentCollector({
				filter,
				time: 60000,
			});
			collector.on("collect", async (m) => {
				if (m.isStringSelectMenu()) {
					if (m.customId === "help-category") {
						await m.deferUpdate();
						let [directory] = m.values;

						const embed = new EmbedBuilder()
							.setAuthor({ name: `${interaction.guild.members.me.displayName} Help`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
							.setDescription(`The bot prefix is: \`/\``)
							.setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 2048 }))
							.setColor("Green")
							.addFields({
								name: `❯  ${directory.toUpperCase()} [${client.commands.filter((c) => c.category === directory).size}]`,
								value: `${client.commands
									.filter((c) => c.category === directory)
									.map((c) => `\`${c.name}\``)
									.join(", ")}`,
								inline: false,
							})
							.setFooter({ text: `© ${interaction.guild.members.me.displayName} | Total Commands: ${client.commands.size}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });

						msg.edit({ embeds: [embed] });
					}
				}
			});

			collector.on("end", async (collected, reason) => {
				if (reason === "time") {
					const timed = new EmbedBuilder()
						.setDescription(
							`${client.i18n.get(language, "utilities", "help_timeout", {
								prefix: "/",
							})}`,
						)
						.setColor("Yellow");

					msg.edit({ embeds: [timed], components: [] });
				}
			});
		});
	},
};
