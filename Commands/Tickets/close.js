const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, embedLength } = require("discord.js");
const ms = require("ms");
const Ticket = require("../../Models/Ticket");
const discordTranscripts = require("discord-html-transcripts");
const fs = require("fs");
const { TICKETS_HISTORY, FQDM } = require("../../config.js");

module.exports = {
  name: "close",
  description: "Close the ticket",
  category: "Tickets",
  UserPerms: ["ManageGuild"],
  options: [
    {
      name: "time",
      description: "Ticket closing time",
      required: true,
      type: 3,
    },
  ],

  /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, language) {
    const { guild, channel, user } = interaction;
    Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
      try {
        const history = data.History;
        const historyChannel = guild.channels.cache.get(history);
        const time = interaction.options.getString("time");
        const serverid = interaction.guild.id;
        client.guilds.cache.get(serverid);
        const channelName = ["bug-", "vprašanje-", "donacija-", "prijava-", "odprto-", "zaprto-", "zaprl-", "odprl-", "closed-", "reopened-", "question-", "report-", "donation-"];
        if (channelName.some((name) => interaction.channel.name.includes(name))) {
          const embed = new EmbedBuilder().setColor("Yellow").setDescription(
            `${client.i18n.get(language, "utilities", "ticket_closing", {
              time: time,
            })}`,
          );
          interaction.reply({ embeds: [embed] });
          try {
            switch (TICKETS_HISTORY) {
              case "web":
                try {
                  const keks = await Ticket.findOne({ Guild: guild.id, Channel: channel.id });
                  const attachment = await discordTranscripts.createTranscript(channel, {
                    limit: -1,
                    returnType: "string",
                    minify: true,
                    saveImages: true,
                    poweredBy: false,
                  });
                  const ticketCreator = await keks.CreatorID;
                  const ticketCreatorUsername = client.users.cache.get(ticketCreator).username;
                  const ticketDate = Date.now();
                  const fileName = `${ticketCreator}${ticketDate}.html`;
                  const dir = "History";
                  if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                  }
                  fs.writeFile(`${dir}/${fileName}`, attachment, (err) => {
                    if (err) throw err;
                  });
                  const ticketLink = `https://${FQDM}/History/${fileName}`;
                  const button = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Pregled Prijave").setURL(ticketLink).setStyle(ButtonStyle.Link));
                  const historyEmbed = new EmbedBuilder()
                    .setTitle(`${client.i18n.get(language, "utilities", "ticket_saved")}`)
                    .setColor("Blurple")
                    .addFields({ name: `${client.i18n.get(language, "utilities", "opened_by")}`, value: `${ticketCreatorUsername}`, inline: true })
                    .addFields({ name: `${client.i18n.get(language, "utilities", "closed_by")}`, value: `${user.username}`, inline: true });
                  await historyChannel.send({ embeds: [historyEmbed], components: [button] });
                } catch (err) {
                  console.log(err);
                }
                break;
              case "local":
                try {
                  const keks = await Ticket.findOne({ Guild: guild.id, Channel: channel.id });
                  const ticketCreator = await keks.CreatorID;
                  const ticketCreatorUsername = client.users.cache.get(ticketCreator).username;
                  const ticketDate = Date.now();
                  const fileName = `${ticketCreator}${ticketDate}.html`;
                  const attachment = await discordTranscripts.createTranscript(channel, {
                    limit: -1, // Max amount of messages to fetch. `-1` recursively fetches.
                    returnType: "attachment", // Valid options: 'buffer' | 'string' | 'attachment' Default: 'attachment' OR use the enum ExportReturnType
                    filename: fileName, // Only valid with returnType is 'attachment'. Name of attachment.
                    saveImages: true, // Download all images and include the image data in the HTML (allows viewing the image even after it has been deleted) (! WILL INCREASE FILE SIZE !)
                    footerText: "Exported {number} message{s}", // Change text at footer, don't forget to put {number} to show how much messages got exported, and {s} for plural
                    poweredBy: false, // Whether to include the "Powered by discord-html-transcripts" footer
                  });
                  const historyEmbed = new EmbedBuilder()
                    .setTitle(`${client.i18n.get(language, "utilities", "ticket_saved")}`)
                    .setColor("Blurple")
                    .addFields({ name: `${client.i18n.get(language, "utilities", "opened_by")}`, value: `${ticketCreatorUsername}`, inline: true })
                    .addFields({ name: `${client.i18n.get(language, "utilities", "closed_by")}`, value: `${user.username}`, inline: true });
                  await historyChannel.send({ embeds: [historyEmbed], files: [attachment] });
                } catch (err) {
                  console.log(err);
                }
                break;
            }
          } catch (err) {
            console.log(err);
          }
          setTimeout(() => {
            Ticket.deleteOne({ Channel: interaction.channel.id });
            interaction.channel.delete();
          }, ms(`${time}`));
        } else {
          const embed = new EmbedBuilder().setColor("Red").setDescription(`${client.i18n.get(language, "utilities", "invalid_channel")}`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (err) {
        console.log(err);
      }
    });
  },
};
