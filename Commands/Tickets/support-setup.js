const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChatInputCommandInteraction, Client, GuildMember } = require("discord.js");
const Ticket = require("../../Models/Ticket.js");

module.exports = {
  name: "setup",
  description: "Support Ticket System setup",
  category: "Tickets",
  UserPerms: ["ManageGuild"],
  options: [
    {
      name: "channel",
      description: "Channel for ticket message",
      required: true,
      type: 7,
    },
    {
      name: "category",
      description: "Category for new tickets",
      required: true,
      type: 7,
    },
    {
      name: "support-role",
      description: "Choose your Support Role",
      required: true,
      type: 8,
    },
    {
      name: "history",
      description: "Channel where ticket history will be loged",
      required: true,
      type: 7,
    },
  ],
  /**
   * @param {Client} client
   * @param {GuildMember} member
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, language) {
    const { options, guild } = interaction;
    const channel = options.getChannel("channel");
    const category = options.getChannel("category");
    const role = options.getRole("support-role");
    const history = options.getChannel("history");

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle(`${client.i18n.get(language, "tickets", "support_ticket_title")}`)
      .setDescription(`${client.i18n.get(language, "tickets", "support_ticket_message")}`)
      .setFooter({ text: `Support ${interaction.guild.name}` });
    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select")
        .setMaxValues(1)
        .setPlaceholder(`${client.i18n.get(language, "tickets", "support_ticket_placeholder")}`)
        .addOptions(
          {
            label: `${client.i18n.get(language, "tickets", "question_label")}`,
            value: `question`,
          },
          {
            label: `${client.i18n.get(language, "tickets", "user_label")}`,
            value: `player`,
          },
          {
            label: `${client.i18n.get(language, "tickets", "donation_label")}`,
            value: `donation`,
          },
        ),
    );
    const m = await channel.send({ embeds: [embed], components: [menu] });
    Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
      if (!data) {
        Ticket.create({
          Guild: guild.id,
          Channel: category.id,
          ChannelID: channel.id,
          Ticket: "support-ticket-message",
          MessageID: m.id,
          SupportRole: role.id,
          History: history.id,
        });
      } else {
        const embed = new EmbedBuilder().setColor("Yellow").setDescription(`${client.i18n.get(language, "tickets", "setup_error")}`);
        const em = await interaction.reply({ embeds: [embed], ephemeral: true });
        setTimeout(() => {
          em.delete();
        }, 4000);
      }
    });
    const embed_success = new EmbedBuilder().setColor("Green").setDescription(
      `${client.i18n.get(language, "tickets", "setup_success", {
        channel: channel.name,
        category: category.name,
      })}`,
    );
    const es = await interaction.reply({ embeds: [embed_success], ephemeral: true });
    setTimeout(() => {
      es.delete();
    }, 6000);
  },
};
