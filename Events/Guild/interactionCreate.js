const {
  Client,
  CommandInteraction,
  InteractionType,
  EmbedBuilder,
  ModalBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
  Embed,
} = require("discord.js");
const { ApplicationCommand } = InteractionType;
const Reply = require("../../Systems/Reply");
const GLang = require("../../Models/Language.js");
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
            await channel.setName(
              `${client.i18n.get(language, "tickets", "closed", {
                user: interaction.user.username,
              })}`,
            );
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
            await channel.setName(
              `${client.i18n.get(language, "tickets", "reopened", {
                user: interaction.user.username,
              })}`,
            );
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
                .setLabel(`${client.i18n.get(language, "tickets", "locked_label")}`)
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
      if (customId === "claim") {
        const embed = new EmbedBuilder().setColor("Yellow").setDescription(
          `${client.i18n.get(language, "tickets", "claimed", {
            user: interaction.user.tag,
          })}`,
        );
        interaction.reply({ content: `||<@${user.id}>||`, embeds: [embed] });
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
                  const embedOff = new EmbedBuilder()
                    .setTitle(`${client.i18n.get(language, "tickets", "support_ticket_title")}`)
                    .setDescription(`${client.i18n.get(language, "tickets", "support_ticket_message_off")}`)
                    .setColor("Red");

                  await message.edit({ embeds: [embedOff], components: [] });
                  const embedoff = new EmbedBuilder().setColor("Green").setDescription(`${client.i18n.get(language, "tickets", "support_manager_off")}`);
                  const m = await interaction.reply({ embeds: [embedoff], ephemeral: true });
                  setTimeout(() => {
                    m.delete();
                  }, 4000);
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
            const modalQuestion = new ModalBuilder().setCustomId("TicketQuestionModal").setTitle(`${client.i18n.get(language, "modals", "q_modal_title")}`);

            const question = new TextInputBuilder()
              .setCustomId("question")
              .setLabel(`${client.i18n.get(language, "modals", "q_modal_question")}`)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "q_modal_question_placeholder")}`);
            const mcnameq = new TextInputBuilder()
              .setCustomId("mcnameq")
              .setLabel(`${client.i18n.get(language, "modals", "q_modal_username")}`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "q_modal_username_placeholder")}`);

            const firstActionRowQ = new ActionRowBuilder().addComponents(question);
            const secondActionRowQ = new ActionRowBuilder().addComponents(mcnameq);

            modalQuestion.addComponents(firstActionRowQ, secondActionRowQ);
            await interaction.showModal(modalQuestion);
            Ticket.findOne(
              { Guild: guildId, MessageID: message.id, Ticket: "support-ticket-message" },
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

            const modalPlayer = new ModalBuilder().setCustomId("TicketPlayerModal").setTitle(`${client.i18n.get(language, "modals", "r_modal_title")}`);

            const ticketMCnamePlayer = new TextInputBuilder()
              .setCustomId("ticketMCname")
              .setLabel(`${client.i18n.get(language, "modals", "r_modal_username")}`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "r_modal_username_placeholder")}`);

            const reportedPlayer = new TextInputBuilder()
              .setCustomId("reportedPlayer")
              .setLabel(`${client.i18n.get(language, "modals", "r_modal_player")}`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "r_modal_player_placeholder")}`);

            const ticketPlayerDescriptionInput = new TextInputBuilder()
              .setCustomId("ticketPlayerDescriptionInput")
              .setLabel(`${client.i18n.get(language, "modals", "r_modal_situation")}`)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "r_modal_situation_placeholder")}`);

            const firstActionRow = new ActionRowBuilder().addComponents(ticketMCnamePlayer);
            const secondActionRow = new ActionRowBuilder().addComponents(reportedPlayer);
            const thirdAcrtionRow = new ActionRowBuilder().addComponents(ticketPlayerDescriptionInput);

            modalPlayer.addComponents(firstActionRow, secondActionRow, thirdAcrtionRow);

            await interaction.showModal(modalPlayer);
            Ticket.findOne({ Guild: guildId, MessageID: message.id, Ticket: "support-ticket-message" }, async (err, data) => {
              message.edit({ content: null });
            });
            break;
          case "donation":
            if (interaction.isButton()) return;
            if (interaction.isChatInputCommand()) return;

            const modalDonation = new ModalBuilder().setCustomId("TicketDonacijaModal").setTitle(`${client.i18n.get(language, "modals", "d_modal_title")}`);

            const ticketMCnameDonacija = new TextInputBuilder()
              .setCustomId("ticketMCnameDonacija")
              .setLabel(`${client.i18n.get(language, "modals", "d_modal_username")}`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "d_modal_username_placeholder")}`);

            const tos = new TextInputBuilder()
              .setCustomId("tos")
              .setLabel(`${client.i18n.get(language, "modals", "d_modal_tos")}`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "d_modal_tos_placeholder")}`);

            const shopItems = new TextInputBuilder()
              .setCustomId("shopItems")
              .setLabel(`${client.i18n.get(language, "modals", "d_modal_packages")}`)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "d_modal_packages_placeholder")}`);

            const psc = new TextInputBuilder()
              .setCustomId("psc")
              .setLabel(`${client.i18n.get(language, "modals", "d_modal_psc")}`)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder(`${client.i18n.get(language, "modals", "d_modal_psc_placeholder")}`);

            const firstActionRowD = new ActionRowBuilder().addComponents(ticketMCnameDonacija);
            const secondActionRowD = new ActionRowBuilder().addComponents(tos);
            const thirdActionRow = new ActionRowBuilder().addComponents(shopItems);
            const fourthActionRow = new ActionRowBuilder().addComponents(psc);

            modalDonation.addComponents(firstActionRowD, secondActionRowD, thirdActionRow, fourthActionRow);

            await interaction.showModal(modalDonation);
            Ticket.findOne({ Guild: guildId, MessageID: message.id, Ticket: "support-ticket-message" }, async (err, data) => {
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
          const ticketUserQ = `${client.i18n.get(language, "modals", "question_ticket", {
            user: interaction.user.username,
          })}`;
          const channelsQ = await guild.channels.fetch();
          const posChannelQ = channelsQ.find((c) => c.name === ticketUserQ.toLowerCase());

          const qReplyEmbed = new EmbedBuilder().setColor("Yellow").setDescription(
            `${client.i18n.get(language, "tickets", "already_opened", {
              channel: posChannelQ,
            })}`,
          );
          if (posChannelQ) return interaction.reply({ embeds: [qReplyEmbed], ephemeral: true });

          const embedQ = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`${interaction.user.username}'s Ticket`)
            .setDescription(
              `${client.i18n.get(language, "modals", "q_embed_desc", {
                user: user.id,
              })}`,
            )
            .addFields({ name: `${client.i18n.get(language, "modals", "q_field_question")}`, value: `${question}` })
            .addFields({ name: `${client.i18n.get(language, "modals", "q_field_username")}`, value: `${mcnameq}` })
            .addFields({ name: `${client.i18n.get(language, "modals", "q_field_type")}`, value: `${client.i18n.get(language, "modals", "q_field_type_value")}` })
            .setFooter({ text: `${interaction.guild.name} Support` });
          Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
            try {
              const supportRole = data.SupportRole;
              const parentCategory = data.Channel;
              let channelQ = await interaction.guild.channels.create({
                name: ticketUserQ,
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
              lockQ.addComponents(
                new ButtonBuilder()
                  .setCustomId("lock")
                  .setLabel(`${client.i18n.get(language, "tickets", "locked_label")}`)
                  .setStyle("Secondary")
                  .setEmoji("🔒"),
                new ButtonBuilder()
                  .setCustomId("claim")
                  .setLabel(`${client.i18n.get(language, "tickets", "claim")}`)
                  .setStyle("Secondary")
                  .setEmoji("🎟️"),
              );
              const msgQ = await channelQ.send({ embeds: [embedQ], components: [lockQ] });

              await Ticket.create({
                Guild: guild.id,
                Channel: channelQ.id,
                MessageID: msgQ.id,
                CreatorID: user.id,
              });
              const openedEmbedQ = new EmbedBuilder().setColor("Green").setDescription(
                `${client.i18n.get(language, "tickets", "ticked_opened", {
                  channel: channelQ,
                })}`,
              );
              interaction.reply({ embeds: [openedEmbedQ], ephemeral: true });
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

              const ticketUserP = `${client.i18n.get(language, "modals", "report_ticket", {
                user: interaction.user.username,
              })}`;
              const channelsP = await guild.channels.fetch();
              const posChannelP = channelsP.find((c) => c.name === ticketUserP.toLowerCase());
              const pReplyEmbed = new EmbedBuilder().setColor("Yellow").setDescription(
                `${client.i18n.get(language, "tickets", "already_opened", {
                  channel: posChannelP,
                })}`,
              );
              if (posChannelP) return interaction.reply({ embeds: [pReplyEmbed], ephemeral: true });

              const embedP = new EmbedBuilder()
                .setColor("Green")
                .setTitle(`${interaction.user.username}'s Ticket`)
                .setDescription(
                  `${client.i18n.get(language, "modals", "r_embed_desc", {
                    user: interaction.user.id,
                  })}`,
                )
                .addFields({ name: `${client.i18n.get(language, "modals", "r_field_username")}`, value: `${ticketMCname}` })
                .addFields({ name: `${client.i18n.get(language, "modals", "r_field_player")}`, value: `${reportedPlayer}` })
                .addFields({ name: `${client.i18n.get(language, "modals", "r_field_desc")}`, value: `${ticketDescriptionInput}` })
                .addFields({ name: `${client.i18n.get(language, "modals", "r_field_type")}`, value: `${client.i18n.get(language, "modals", "r_field_type_value")}` })
                .setFooter({ text: `${interaction.guild.name} Support` });

              let channelP = await interaction.guild.channels.create({
                name: ticketUserP,
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
              lockP.addComponents(
                new ButtonBuilder()
                  .setCustomId("lock")
                  .setLabel(`${client.i18n.get(language, "tickets", "locked_label")}`)
                  .setStyle("Secondary")
                  .setEmoji("🔒"),
              );
              const msgP = await channelP.send({ embeds: [embedP], components: [lockP] });

              await Ticket.create({
                Guild: guild.id,
                Channel: channelP.id,
                MessageID: msgP.id,
              });
              const openedEmbedP = new EmbedBuilder().setColor("Green").setDescription(
                `${client.i18n.get(language, "tickets", "ticket_opened", {
                  channel: channelP,
                })}`,
              );
              interaction.reply({ embeds: [openedEmbedP], ephemeral: true });
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

              const ticketUserD = `${client.i18n.get(language, "modals", "donation_ticket", {
                user: interaction.user.username,
              })}`;
              const channelsD = await guild.channels.fetch();
              const posChannelD = channelsD.find((c) => c.name === ticketUserD.toLowerCase());
              const dReplyEmbed = new EmbedBuilder().setColor("Yellow").setDescription(
                `${client.i18n.get(language, "tickets", "already_opened", {
                  channel: posChannelD.id,
                })}`,
              );
              if (posChannelD) return interaction.reply({ embeds: [dReplyEmbed], ephemeral: true });

              const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle(`${interaction.user.username}'s Ticket`)
                .setDescription(
                  `${client.i18n.get(language, "modals", "d_embed_desc", {
                    user: interaction.user.id,
                  })}`,
                )
                .addFields({ name: `${client.i18n.get(language, "modals", "d_field_username")}`, value: `${ticketMCnameDonacija}` })
                .addFields({ name: `${client.i18n.get(language, "modals", "d_field_tos")}`, value: `${tos}` })
                .addFields({ name: `${client.i18n.get(language, "modals", "d_field_packages")}`, value: `${shopItems}` })
                .addFields({ name: `${client.i18n.get(language, "modals", "d_field_psc")}`, value: `${psc}` })
                .addFields({ name: `${client.i18n.get(language, "modals", "d_field_type")}`, value: `${client.i18n.get(language, "modals", "d_field_type_value")}` })
                .setFooter({ text: `${interaction.guild.name} Support` });

              let channel = await interaction.guild.channels.create({
                name: ticketUserD,
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
              lockD.addComponents(
                new ButtonBuilder()
                  .setCustomId("lock")
                  .setLabel(`${client.i18n.get(language, "tickets", "locked_label")}`)
                  .setStyle("Secondary")
                  .setEmoji("🔒"),
              );
              const msg = await channel.send({ embeds: [embed], components: [lockD] });

              await Ticket.create({
                Guild: guild.id,
                Channel: channel.id,
                MessageID: msg.id,
              });
              const openedEmbedD = new EmbedBuilder().setColor("Green").setDescription(
                `${
                  (client.i18n.get(language, "tickets", "ticket_opened"),
                  {
                    channel: channel,
                  })
                }`,
              );
              interaction.reply({ embeds: [openedEmbedD], ephemeral: true });
            } catch (err) {
              throw new Error(err);
            }
          });

          break;
      }
    }
  },
};
