const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client } = require("discord.js");
const Ticket = require("../../Models/Ticket.js");

module.exports = {
  name: "assign",
  description: "Assign Staff member to ticket",
  category: "Tickets",
  UserPerms: ["ManageGuild"],
  options: [
    {
      name: "user",
      description: "User to Assign",
      required: true,
      type: 6,
    },
  ],
  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, language) {
    const { options } = interaction;
    const assignee = options.getUser("user");
    const embed = new EmbedBuilder().setColor("Yellow").setDescription(
      `${client.i18n.get(language, "tickets", "claimed", {
        user: assignee.tag,
      })}`,
    );
    interaction.reply({ content: `||${assignee}||`, embeds: [embed] });
  },
};
