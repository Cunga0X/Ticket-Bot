const { Client, Message } = require("discord.js");

const Ticket = require("../../Models/Ticket");
const TicketStats = require("../../Models/TicketStats");

module.exports = {
  name: "messageCreate",

  /**
   * @param {Message} message
   * @param {Client} client
   */
  async execute(message, client) {
    const { author, guild } = message;
    if (author.bot) return;
    Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
      const supportRole = data.SupportRole;
      const channels = ["bug-", "vprašanje-", "donacija-", "prijava-", "odprto-", "zaprto-", "zaprl-", "odprl-", "closed-", "reopened-", "question-", "report-", "donation-"];
      if (message.member.roles.cache.some((role) => role.id === supportRole) && channels.some((name) => message.channel.name.includes(name))) {
        TicketStats.findOne({ Guild: guild.id, StaffMember: author.id }, async (err, data) => {
          if (!data) {
            try {
              TicketStats.create({ Guild: guild.id, StaffMember: author.id, Messages: 1 });
            } catch (err) {
              console.log(err);
            }
          }
          if (data) {
            try {
              const data = await TicketStats.findOne({ Guild: guild.id, StaffMember: author.id });
              data.Messages += 1;
              await data.save();
            } catch (err) {
              console.log(err);
            }
          }
        });
      }
    });
  },
};
