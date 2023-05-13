const TicketStats = require("../../Models/TicketStats");
const Ticket = require("../../Models/Ticket");
const { EmbedBuilder, ChatInputCommandInteraction, Client, embedLength, Embed } = require("discord.js");

module.exports = {
  name: "stats",
  description: "Show stats of ticket interactions",
  category: "Tickets",

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, language) {
    const { guild, user } = interaction;

    const keks = await Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" });
    const supportRole = keks.SupportRole;
    let requiredRole = guild.roles.cache.get(supportRole);
    let member = guild.members.cache.get(user.id);
    if (member.roles.cache.has(requiredRole.id)) {
      const data = await TicketStats.find({ Guild: guild.id })
        .sort({
          Messages: -1,
        })
        .limit(10)
        .catch((err) => {
          console.log(err);
        });
      const nodata = new EmbedBuilder().setColor("Yellow").setDescription(`${client.i18n.get(language, "tickets", "no_stats_data")}`);
      if (!data) interaction.reply({ emebds: nodata });

      let text = "";
      for (let counter = 0; counter < data.length; ++counter) {
        const { StaffMember, Messages = 0 } = data[counter];

        const Member = guild.members.cache.get(StaffMember);

        let MemberTag;

        if (Member) MemberTag = Member.user.tag;
        else MemberTag = "Unknown";

        text += `${counter + 1}. ${MemberTag} | Messages: ${Messages}\n`;
      }

      interaction.reply({
        embeds: [new EmbedBuilder().setColor("Blurple").setTitle("Tickets Statistic").setDescription(`\`\`\`${text}\`\`\``)],
      });
    } else {
      const embed = new EmbedBuilder().setColor("Yellow").setDescription(`${client.i18n.get(language, "tickets", "no_role")}`);
      interaction.reply({ embeds: [embed] });
    }
  },
};
