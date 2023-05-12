const { Client, CommandInteraction, InteractionType, EmbedBuilder, ModalBuilder, ActionRowBuilder, StringSelectMenuBuilder, TextInputBuilder, ButtonBuilder, ButtonStyle, TextInputStyle, ChannelType, PermissionsBitField } = require("discord.js");
const { ApplicationCommand } = InteractionType;
const Reply = require("../../Systems/Reply");
const GLang = require("../../Models/Language.js");
const Staff = require("../../Models/Staff");
const Ticket = require("../../Models/Ticket");

module.exports = {
  name: "interactionCreate",

  /**
   * @param {CommandInteraction} interaction
   * @param {Client} client
   */
  async execute(interaction, client) {
    const { user, guild, commandName, member, type, customId, fields, message, guildId, channel } = interaction;
    await GLang.findOne({ guild: interaction.guild.id }, async (err, data) => {
      if (!data) {
        GLang.create({
          guild: guild.id,
          language: "en",
        });
      }
    });
    const guildModel = await GLang.findOne({ guild: interaction.guild.id });
    const { language } = guildModel;

    if (!guild || user.bot) return;

    //! Slash Command Interactions
    if (type == ApplicationCommand) {
      const command = client.commands.get(commandName);

      const no_command = new EmbedBuilder().setColor("Red").setDescription(`${client.i18n.get(language, "interaction", "no_command_error")}`);
      const user_no_perm = new EmbedBuilder().setDescription(
        `${client.i18n.get(language, "interaction", "user_missing_perm", {
          user_permission: command.UserPerms,
        })}`,
      );
      const bot_no_perm = new EmbedBuilder().setColor("Red").setDescription(
        `${client.i18n.get(language, "interaction", "bot_missing_perm", {
          bot_permission: command.BotPerms,
        })}`,
      );

      if (!command) return interaction.reply({ embeds: [no_command], ephemeral: true }) && client.commands.delete(commandName);

      if (command.UserPerms && command.UserPerms.length !== 0) if (!member.permissions.has(command.UserPerms)) return interaction.reply({ embeds: [user_no_perm], ephemeral: true });

      if (command.BotPerms && command.BotPerms.length !== 0) if (!guild.members.me.permissions.has(command.BotPerms)) return interaction.reply({ embeds: [bot_no_perm], ephemeral: true });

      command.execute(interaction, client, language);
    }
    //! Button Interactions
    if (interaction.isButton()) {
      if (customId == "lock") {
        try {
          await Ticket.findOne({ Guild: guild.id, MessageID: message.id }, async (err, data) => {
            const channelid = interaction.channel.id;
            const channel = client.channels.cache.get(channelid);
            const userid = data.CreatorID;
            await channel.setName(`zaprl-${interaction.user.username}`);
            const main = await Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" });
            const supportRole = main.SupportRole;
            await channel.permissionOverwrites.set([
              {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
              {
                id: userid,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                deny: [PermissionsBitField.Flags.SendMessages],
              },
              {
                id: supportRole,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                deny: [PermissionsBitField.Flags.SendMessages],
              },
            ]);
            const embed = new EmbedBuilder().setColor("Yellow").setDescription(`${client.i18n.get(language, "tickets", "ticket_locked")}`);
            const unlock = new ActionRowBuilder();
            unlock.addComponents(
              new ButtonBuilder()
                .setCustomId("unlock")
                .setLabel(`${client.i18n.get(language, "tickets", "unlock_label")}`)
                .setStyle("Secondary")
                .setEmoji("🔓"),
            );
            interaction.reply({ embeds: [embed] });
            const initialMessageID = data.MessageID;
            const initialMessage = await channel.messages.fetch(initialMessageID);
            initialMessage.edit({ components: [unlock] });
          });
        } catch (err) {
          console.log(err);
        }
      }
      if (customId == "unlock") {
        try {
          await Ticket.findOne({ Guild: guild.id, MessageID: message.id }, async (err, data) => {
            const channelid = interaction.channel.id;
            const channel = client.channels.cache.get(channelid);
            const userid = data.CreatorID;
            await channel.setName(`odprto-${interaction.user.username}`);
            const main = await Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" });
            const supportRole = main.SupportRole;
            await channel.permissionOverwrites.set([
              {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
              {
                id: userid,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.SendMessages],
              },
              {
                id: supportRole,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.SendMessages],
              },
            ]);
            const embed = new EmbedBuilder().setColor("Yellow").setDescription(`${client.i18n.get(language, "tickets", "ticket_unlocked")}`);
            const unlock = new ActionRowBuilder();
            unlock.addComponents(
              new ButtonBuilder()
                .setCustomId("lock")
                .setLabel(`${client.i18n.get(language, "tickets", "lock_label")}`)
                .setStyle("Secondary")
                .setEmoji("🔒"),
            );
            interaction.reply({ embeds: [embed] });
            const initialMessageID = data.MessageID;
            const initialMessage = await channel.messages.fetch(initialMessageID);
            initialMessage.edit({ components: [unlock] });
          });
        } catch (err) {
          console.log(err);
        }
      }
      if (customId == "support-ticket-enable" || customId == "ticket-disable") {
        Ticket.findOne({ Guild: guild.id, Message: message.id, Channel: channel.id, Ticket: "support-ticket-message" }, async (err, data) => {
          switch (customId) {
            case "support-ticket-enable":
              await Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
                if (!data) return interaction.reply(`${client.i18n.get(language, "tickets", "error")}`);
                const channelid = data.ChannelID;
                const messageid = data.MessageID;
                try {
                  const channel = client.channels.cache.get(channelid);
                  const message = await channel.messages.fetch(messageid);
                  const embedOn = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`${client.i18n.get(language, "tickets", "support_ticket_title")}`)
                    .setDescription(`${client.i18n.get(language, "tickets", "support_ticket_message")}`)
                    .setFooter({ text: `Staff ${interaction.guild.name}` });
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
                  await message.edit({ embeds: [embedOn], components: [menu] });
                  const embed = new EmbedBuilder().setColor("Green").setDescription(`${client.i18n.get(language, "tickets", "support_manager_on")}`);
                  const m = await interaction.reply({ embeds: [embed], ephemeral: true });
                  setTimeout(() => {
                    m.delete();
                  }, 4000);
                } catch (err) {
                  console.error(err);
                }
              });

              break;
            case "ticket-disable":
              await Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
                if (!data) return interaction.reply(`${client.i18n.get(language, "tickets", "error")}`);
                const messageid = data.MessageID;
                const channelid = data.ChannelID;

                try {
                  const channel = client.channels.cache.get(channelid);
                  const message = await channel.messages.fetch(messageid);
                  const embed = message.embeds[0];
                  if (!embed) return interaction.reply(`${client.i18n.get(language, "tickets", "error")}`);
                  const embedOff = new EmbedBuilder().setTitle("Potrebuješ pomoč?").setDescription("Prijave so trenutno zaprte!").setColor("Red");

                  await message.edit({ embeds: [embedOff], components: [] });
                  Reply(interaction, "Green", "✅", "Prijave so zaprte", true);
                } catch (error) {
                  console.error(error);
                }
              });
              break;
          }
        });
      }
    }
    //! String Menu Interactions
    if (interaction.isStringSelectMenu) {
      if (customId == "select") {
        let selected = interaction.values[0];
        switch (selected) {
          case "question":
            if (!interaction.isStringSelectMenu()) return;
            const modalQuestion = new ModalBuilder().setCustomId("TicketQuestionModal").setTitle("Prosimo, da nam posredujete več informacij");

            const question = new TextInputBuilder().setCustomId("question").setLabel("Kako vam lahko pomagamo?").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("Vaše vprašanje");
            const mcnameq = new TextInputBuilder().setCustomId("mcnameq").setLabel("Ime v Igri").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Vaše ime v Minecraftu");

            const firstActionRowQ = new ActionRowBuilder().addComponents(question);
            const secondActionRowQ = new ActionRowBuilder().addComponents(mcnameq);

            modalQuestion.addComponents(firstActionRowQ, secondActionRowQ);
            await interaction.showModal(modalQuestion);
            Ticket.findOne(
              { Guild: guildId, MessageID: message.id, Ticket: "first" },
              async (err, data) => {
                setTimeout(() => {
                  message.edit({ content: null });
                });
              },
              1000,
            );

            break;
          case "player":
            if (interaction.isButton()) return;
            if (interaction.isChatInputCommand()) return;

            const modalPlayer = new ModalBuilder().setCustomId("TicketPlayerModal").setTitle("Prosimo, da nam posredujete več informacij");

            const ticketMCnamePlayer = new TextInputBuilder().setCustomId("ticketMCname").setLabel("Vaše Minecraft uporabniško ime").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Jože");

            const reportedPlayer = new TextInputBuilder().setCustomId("reportedPlayer").setLabel("Igralec, ki ga prijavljate").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Miha");

            const ticketPlayerDescriptionInput = new TextInputBuilder().setCustomId("ticketPlayerDescriptionInput").setLabel("Opišite situacijo").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("Miha uporablja hacked-client.");

            const firstActionRow = new ActionRowBuilder().addComponents(ticketMCnamePlayer);
            const secondActionRow = new ActionRowBuilder().addComponents(reportedPlayer);
            const thirdAcrtionRow = new ActionRowBuilder().addComponents(ticketPlayerDescriptionInput);

            modalPlayer.addComponents(firstActionRow, secondActionRow, thirdAcrtionRow);

            await interaction.showModal(modalPlayer);
            Ticket.findOne({ Guild: guildId, MessageID: message.id, Ticket: "first" }, async (err, data) => {
              message.edit({ content: null });
            });
            break;
          case "donation":
            if (interaction.isButton()) return;
            if (interaction.isChatInputCommand()) return;

            const modalDonation = new ModalBuilder().setCustomId("TicketDonacijaModal").setTitle("Prosimo, da nam posredujete več informacij");

            const ticketMCnameDonacija = new TextInputBuilder().setCustomId("ticketMCnameDonacija").setLabel("Vaše Minecraft uporabniško ime").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Jože");

            const tos = new TextInputBuilder().setCustomId("tos").setLabel("Ali se strinjate z Terms of Use").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Da/Ne");

            const shopItems = new TextInputBuilder().setCustomId("shopItems").setLabel("Katere Izdelke želite pridobiti?").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("Rank VIP");

            const psc = new TextInputBuilder().setCustomId("psc").setLabel("PaySafeCard Koda").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("0123-4567-8910-1112");

            const firstActionRowD = new ActionRowBuilder().addComponents(ticketMCnameDonacija);
            const secondActionRowD = new ActionRowBuilder().addComponents(tos);
            const thirdActionRow = new ActionRowBuilder().addComponents(shopItems);
            const fourthActionRow = new ActionRowBuilder().addComponents(psc);

            modalDonation.addComponents(firstActionRowD, secondActionRowD, thirdActionRow, fourthActionRow);

            await interaction.showModal(modalDonation);
            Ticket.findOne({ Guild: guildId, MessageID: message.id, Ticket: "first" }, async (err, data) => {
              message.edit({ content: null });
            });
            break;
        }
      }
    }
    //! Modal Submit Interactions
    if (interaction.isModalSubmit) {
      switch (customId) {
        case "TicketQuestionModal":
          const question = fields.getTextInputValue("question");
          const mcnameq = fields.getTextInputValue("mcnameq");

          const ticketUserQ = `vprašanje-${interaction.user.username}`;
          const channelsQ = await guild.channels.fetch();
          const posChannelQ = channelsQ.find((c) => c.name === ticketUserQ.toLowerCase());

          if (posChannelQ) return Reply(interaction, "Yellow", "⚠️", `Ticket že imaš odprt - ${posChannelQ}`, true);

          const embedQ = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`${interaction.user.username}'s Ticket`)
            .setDescription(`Pozdravljen <@!${interaction.user.id}>! Prosim počakajte, da osebje pregleda vaše podatke`)
            .addFields({ name: `Vprašanje`, value: `${question}` })
            .addFields({ name: `Ime v MC`, value: `${mcnameq}` })
            .addFields({ name: `Tip`, value: `Vprašanje` })
            .setFooter({ text: `${interaction.guild.name} Support` });
          Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
            try {
              const supportRole = data.SupportRole;
              const parentCategory = data.Channel;
              let channelQ = await interaction.guild.channels.create({
                name: `vprašanje-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: parentCategory,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: supportRole,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });

              const lockQ = new ActionRowBuilder();
              lockQ.addComponents(new ButtonBuilder().setCustomId("lock").setLabel("Zapri").setStyle("Secondary").setEmoji("🔒"));
              const msgQ = await channelQ.send({ embeds: [embedQ], components: [lockQ] });

              await Ticket.create({
                Guild: guild.id,
                Channel: channelQ.id,
                MessageID: msgQ.id,
                CreatorID: user.id,
              });

              Reply(interaction, "Green", "✅", `Tvoj ticket je odprt - ${channelQ}`, true);
            } catch (err) {
              throw new Error(err);
            }
          });

          break;
        case "TicketPlayerModal":
          Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
            try {
              const supportRole = data.SupportRole;
              const parentCategory = data.Channel;
              const ticketMCname = fields.getTextInputValue("ticketMCname");
              const ticketDescriptionInput = fields.getTextInputValue("ticketPlayerDescriptionInput");
              const reportedPlayer = fields.getTextInputValue("reportedPlayer");

              const ticketUserP = `prijava-${interaction.user.username}`;
              const channelsP = await guild.channels.fetch();
              const posChannelP = channelsP.find((c) => c.name === ticketUserP.toLowerCase());
              if (posChannelP) return Reply(interaction, "Yellow", "⚠️", `Ticket že imaš odprt - ${posChannelP}`, true);

              const embedP = new EmbedBuilder()
                .setColor("Green")
                .setTitle(`${interaction.user.username}'s Ticket`)
                .setDescription(`Pozdravljen <@!${interaction.user.id}>! Prosim počakajte, da osebje pregleda vaše podatke`)
                .addFields({ name: `Ime v MC`, value: `${ticketMCname}` })
                .addFields({ name: `Igralec ki ga prijavlja`, value: `${reportedPlayer}` })
                .addFields({ name: `Opis`, value: `${ticketDescriptionInput}` })
                .addFields({ name: `Tip`, value: `Prijava igralca` })
                .setFooter({ text: `${interaction.guild.name} Support` });

              let channelP = await interaction.guild.channels.create({
                name: `prijava-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: parentCategory,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: supportRole,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });

              const lockP = new ActionRowBuilder();
              lockP.addComponents(new ButtonBuilder().setCustomId("lock").setLabel("Zapri").setStyle("Secondary").setEmoji("🔒"));
              const msgP = await channelP.send({ embeds: [embedP], components: [lockP] });

              await Ticket.create({
                Guild: guild.id,
                Channel: channelP.id,
                MessageID: msgP.id,
              });

              Reply(interaction, "Green", "✅", `Tvoj ticket je odprt - ${channelP}`, true);
            } catch (err) {
              throw new Error(err);
            }
          });

          break;
        case "TicketDonacijaModal":
          Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
            try {
              const parentCategory = data.Channel;
              const ticketMCnameDonacija = fields.getTextInputValue("ticketMCnameDonacija");
              const tos = fields.getTextInputValue("tos");
              const shopItems = fields.getTextInputValue("shopItems");
              const psc = fields.getTextInputValue("psc");

              const ticketUserD = `donacija-${interaction.user.username}`;
              const channelsD = await guild.channels.fetch();
              const posChannelD = channelsD.find((c) => c.name === ticketUserD.toLowerCase());
              if (posChannelD) return Reply(interaction, "Yellow", "⚠️", `Ticket že imaš odprt - ${posChannelD}`, true);

              const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle(`${interaction.user.username}'s Ticket`)
                .setDescription(`Pozdravljen <@!${interaction.user.id}>! Prosim počakajte, da osebje pregleda vaše podatke`)
                .addFields({ name: `Minecraft ime`, value: `${ticketMCnameDonacija}` })
                .addFields({ name: `Terms of Service`, value: `${tos}` })
                .addFields({ name: `Shop Items`, value: `${shopItems}` })
                .addFields({ name: `PaySafeCard`, value: `${psc}` })
                .addFields({ name: `Tip`, value: `Donacija` })
                .setFooter({ text: `${interaction.guild.name} Support` });

              let channel = await interaction.guild.channels.create({
                name: `donacija-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: parentCategory,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });

              const lockD = new ActionRowBuilder();
              lockD.addComponents(new ButtonBuilder().setCustomId("lock").setLabel("Zapri").setStyle("Secondary").setEmoji("🔒"));
              const msg = await channel.send({ embeds: [embed], components: [lockD] });

              await Ticket.create({
                Guild: guild.id,
                Channel: channel.id,
                MessageID: msg.id,
              });

              Reply(interaction, "Green", "✅", `Tvoj ticket je odprt - ${channel}`, true);
            } catch (err) {
              throw new Error(err);
            }
          });

          break;
      }
    }
  },
};
