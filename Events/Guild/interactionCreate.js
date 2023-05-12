const { Client, CommandInteraction, InteractionType, EmbedBuilder, ModalBuilder, ActionRowBuilder, StringSelectMenuBuilder, TextInputBuilder, ButtonBuilder, ButtonStyle, TextInputStyle, ChannelType, PermissionsBitField } = require("discord.js");
const { ApplicationCommand } = InteractionType;
const Reply = require("../../Systems/Reply");
const GLang = require("../../Models/Language.js");
const Staff = require("../../Models/Staff");
const Ticket = require("../../Models/Ticket");
const { createTranscript } = require("discord-html-transcripts");

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
            const supportRole = data.SupportRole;
            const channelid = interaction.channel.id;
            const channel = client.channels.cache.get(channelid);
            const userid = data.CreatorID;
            await channel.setName(`zaprl-${interaction.user.username}`);
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
            const embed = new EmbedBuilder().setColor("Yellow").setDescription("🔒 ・ Prijava zaklenjena, zaprta bo po pregledu.");
            const unlock = new ActionRowBuilder();
            unlock.addComponents(new ButtonBuilder().setCustomId("unlock").setLabel("Odkleni").setStyle("Secondary").setEmoji("🔓"));
            channel.send({ embeds: [embed] });
            const reply = new EmbedBuilder().setColor("Green").setDescription("✅ ・ Prijava uspešno zaklenjena");
            interaction.reply({ embeds: [reply], ephemeral: true });
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
            const supportRole = data.SupportRole;
            const channelid = interaction.channel.id;
            const channel = client.channels.cache.get(channelid);
            const userid = data.CreatorID;
            await channel.setName(`odprto-${interaction.user.username}`);
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
            const embed = new EmbedBuilder().setColor("Yellow").setDescription("🔓 ・ Prijava odklenjena.");
            const unlock = new ActionRowBuilder();
            unlock.addComponents(new ButtonBuilder().setCustomId("lock").setLabel("Zakleni").setStyle("Secondary").setEmoji("🔒"));
            channel.send({ embeds: [embed] });
            const reply = new EmbedBuilder().setColor("Green").setDescription("✅ ・ Prijava uspešno odklenjena");
            interaction.reply({ embeds: [reply], ephemeral: true });
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
                if (!data) return Reply(interaction, "Red", "❌", "No Ticket system found", true);
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
                } catch (error) {
                  console.error(error);
                }
              });

              break;
            case "ticket-disable":
              await Ticket.findOne({ Guild: guild.id, Ticket: "support-ticket-message" }, async (err, data) => {
                if (!data) return Reply(interaction, "Red", "❌", "No Ticket system found", true);
                const messageid = data.MessageID;
                const channelid = data.ChannelID;

                try {
                  const channel = client.channels.cache.get(channelid);
                  const message = await channel.messages.fetch(messageid);
                  const embed = message.embeds[0];
                  if (!embed) return Reply(interaction, "Red", "❌", "No embed was found!", true);
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
      if (customId == "builder-sprejmi" || customId == "builder-zavrni") {
        switch (customId) {
          case "builder-sprejmi":
            await Staff.findOne({ Guild: guildId, MessageID: message.id }, async (err, data) => {
              if (!data) return Reply(interaction, "Red", "❌", "No Ticket found", true);
              const messageid = data.MessageID;
              const userid = data.UserID;
              const username = data.Username;
              let channel = await interaction.guild.channels.create({
                name: `trial-builder-${username}`,
                type: ChannelType.GuildText,
                parent: "1089220607096410223",
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: userid,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: "1103762471061299270",
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });
              const embed = new EmbedBuilder().setTitle(`Pozdravljen ${username}`).setColor("Green").setDescription("Kontaktirali smo te glede tvoje Builder prijave in sicer potrebovali bi nekaj slik tvojih kreacij.");
              const msg = await channel.send({ content: `<@${userid}>`, embeds: [embed], components: [] });
              Staff.findOneAndUpdate({ Guild: guildId, Message: messageid }, { TicketID: channel.id, TicketMessageID: msg.id });
              Reply(interaction, "Green", "✅", `Trial-Builder ${username} sprejet.`);
            });

            break;
          case "builder-zavrni":
            await Staff.findOne({ Guild: guildId, MessageID: message.id }, async (err, data) => {
              if (!data) return Reply(interaction, "Red", "❌", "No Ticket found", true);
              const messageid = data.MessageID;
              const userid = data.UserID;
              const username = data.Username;
              let channel = await interaction.guild.channels.create({
                name: `zavrnjen-${username}`,
                type: ChannelType.GuildText,
                parent: "1089220607096410223",
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: userid,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: "1103762471061299270",
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });
              const embed = new EmbedBuilder().setTitle(`Pozdravljen ${username}`).setColor("Red").setDescription("Kontaktirali smo te glede tvoje Builder prijave in smo se odločili, da tvojo prijavo zavrnemo. Lep pozdrav, osebje SloMc");
              const msg = await channel.send({ content: `<@${userid}>`, embeds: [embed], components: [] });
              Staff.findOneAndUpdate({ Guild: guildId, Message: messageid }, { TicketID: channel.id, TicketMessageID: msg.id });
              Reply(interaction, "Green", "✅", `Trial-Builder ${username} zavrnjen.`);
            });
            break;
        }
      }
      if (customId == "helper-sprejmi" || customId == "helper-zavrni") {
        switch (customId) {
          case "helper-sprejmi":
            await Staff.findOne({ Guild: guildId, MessageID: message.id }, async (err, data) => {
              if (!data) return Reply(interaction, "Red", "❌", "No Ticket found", true);
              const messageid = data.MessageID;
              const userid = data.UserID;
              const username = data.Username;
              let channel = await interaction.guild.channels.create({
                name: `trial-helper-${username}`,
                type: ChannelType.GuildText,
                parent: "1089220607096410223",
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: userid,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: "1103762471061299270",
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });
              const embed = new EmbedBuilder()
                .setTitle(`Pozdravljen ${username}`)
                .setColor("Green")
                .setDescription(
                  "Kontaktirali smo te glede tvoje Helper prijave in smo se odločili, da te sprejmemo kot Trail-Helperja. Več stvari ti bomo objasnili v klicu. Prosim, da nam sporčiš kdaj imaš čas, da se pogovorimo. Dobrodošel v ekipo",
                );
              const msg = await channel.send({ content: `<@${userid}>`, embeds: [embed], components: [] });
              Staff.findOneAndUpdate({ Guild: guildId, Message: messageid }, { TicketID: channel.id, TicketMessageID: msg.id });
              Reply(interaction, "Green", "✅", `Trial-Helper ${username} sprejet.`);
            });

            break;
          case "helper-zavrni":
            await Staff.findOne({ Guild: guildId, MessageID: message.id }, async (err, data) => {
              if (!data) return Reply(interaction, "Red", "❌", "No Ticket found", true);
              const messageid = data.MessageID;
              const userid = data.UserID;
              const username = data.Username;
              let channel = await interaction.guild.channels.create({
                name: `zavrnjen-${username}`,
                type: ChannelType.GuildText,
                parent: "1089220607096410223",
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: userid,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: "1103762471061299270",
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });
              const embed = new EmbedBuilder().setTitle(`Pozdravljen ${username}`).setColor("Red").setDescription("Kontaktirali smo te glede tvoje Helper prijave in smo se odločili, da tvojo prijavo zavrnemo. Lep pozdrav, osebje SloMc");
              const msg = await channel.send({ content: `<@${userid}>`, embeds: [embed], components: [] });
              Staff.findOneAndUpdate({ Guild: guildId, Message: messageid }, { TicketID: channel.id, TicketMessageID: msg.id });
              Reply(interaction, "Green", "✅", `Trial-Helper ${username} zavrnjen.`);
            });
            break;
        }
      }
      if (customId == "dev-sprejmi" || customId == "dev-zavrni") {
        switch (customId) {
          case "dev-sprejmi":
            await Staff.findOne({ Guild: guildId, MessageID: message.id }, async (err, data) => {
              if (!data) return Reply(interaction, "Red", "❌", "No Ticket found", true);
              const messageid = data.MessageID;
              const userid = data.UserID;
              const username = data.Username;
              let channel = await interaction.guild.channels.create({
                name: `trial-dev-${username}`,
                type: ChannelType.GuildText,
                parent: "1089220607096410223",
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: userid,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: "1103762471061299270",
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });
              const embed = new EmbedBuilder()
                .setTitle(`Pozdravljen ${username}`)
                .setColor("Green")
                .setDescription("Kontaktirali smo te glede tvoje Developer prijave in smo se odločili, da ti bomo pripravili manjšo nalogo. Kmalu te kontaktiramo in ti jo predstavimo. Lep Pozdrav, Osebje SloMc");
              const msg = await channel.send({ content: `<@${userid}>`, embeds: [embed], components: [] });
              Staff.findOneAndUpdate({ Guild: guildId, Message: messageid }, { TicketID: channel.id, TicketMessageID: msg.id });
              Reply(interaction, "Green", "✅", `Trial-Developer ${username} sprejet.`);
            });

            break;
          case "dev-zavrni":
            await Staff.findOne({ Guild: guildId, MessageID: message.id }, async (err, data) => {
              if (!data) return Reply(interaction, "Red", "❌", "No Ticket found", true);
              const messageid = data.MessageID;
              const userid = data.UserID;
              const username = data.Username;
              let channel = await interaction.guild.channels.create({
                name: `zavrnjen-${username}`,
                type: ChannelType.GuildText,
                parent: "1089220607096410223",
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                  },
                  {
                    id: userid,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                  {
                    id: "1103762471061299270",
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.ReadMessageHistory],
                  },
                ],
              });
              const embed = new EmbedBuilder().setTitle(`Pozdravljen ${username}`).setColor("Red").setDescription("Kontaktirali smo te glede tvoje Developer prijave in smo se odločili, da tvojo prijavo zavrnemo. Lep pozdrav, osebje SloMc");
              const msg = await channel.send({ content: `<@${userid}>`, embeds: [embed], components: [] });
              Staff.findOneAndUpdate({ Guild: guildId, Message: messageid }, { TicketID: channel.id, TicketMessageID: msg.id });
              Reply(interaction, "Green", "✅", `Trial-Developer ${username} zavrnjen.`);
            });
            break;
        }
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
      if (customId == "select-staff") {
        let selected = interaction.values[0];
        switch (selected) {
          case "helper":
            if (interaction.isButton()) return;
            if (interaction.isChatInputCommand()) return;

            const modalHelper = new ModalBuilder().setCustomId("helper").setTitle("Prosimo, da nam posredujete več informacij");

            const nameMChelper = new TextInputBuilder().setCustomId("nameMChelper").setLabel("Vaše Minecraft ime").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Jože").setMaxLength(400);

            const izkusnjeHelper = new TextInputBuilder().setCustomId("izkusnjeHelper").setLabel("Vaše dosedanje izkušnje").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(30).setMaxLength(4000);

            const zakajHelper = new TextInputBuilder().setCustomId("zakajHelper").setLabel("Zakaj bi izbrali ravno tebe?").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(30).setMaxLength(1024);

            const firstActionRowH = new ActionRowBuilder().addComponents(nameMChelper);
            const secondActionRowH = new ActionRowBuilder().addComponents(izkusnjeHelper);
            const thirdActionRowH = new ActionRowBuilder().addComponents(zakajHelper);

            modalHelper.addComponents(firstActionRowH, secondActionRowH, thirdActionRowH);

            await interaction.showModal(modalHelper);
            Ticket.findOne({ Guild: guildId, MessageID: message.id, Ticket: "staff-first" }, async (err, data) => {
              message.edit({ content: null });
            });
            break;
          case "builder":
            if (interaction.isButton()) return;
            if (interaction.isChatInputCommand()) return;

            const modalBuilder = new ModalBuilder().setCustomId("builder").setTitle("Prosimo, da nam posredujete več informacij");

            const nameMCbuilder = new TextInputBuilder().setCustomId("nameMCbuilder").setLabel("Vaše Minecraft ime").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Jože").setMaxLength(400);

            const izkusnjeBuilder = new TextInputBuilder().setCustomId("izkusnjeBuilder").setLabel("Vaše dosedanje izkušnje").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(30).setMaxLength(4000);

            const zakajBuilder = new TextInputBuilder().setCustomId("zakajBuilder").setLabel("Zakaj bi izbrali ravno tebe?").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(30).setMaxLength(1024);

            const stilBuilder = new TextInputBuilder().setCustomId("stilBuilder").setLabel("Vaš stil grajenja").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Mesta, Spawni, itd.").setMaxLength(400);

            const firstActionRowB = new ActionRowBuilder().addComponents(nameMCbuilder);
            const secondActionRowB = new ActionRowBuilder().addComponents(izkusnjeBuilder);
            const thirdActionRowB = new ActionRowBuilder().addComponents(zakajBuilder);
            const fourthActionRowB = new ActionRowBuilder().addComponents(stilBuilder);

            modalBuilder.addComponents(firstActionRowB, secondActionRowB, thirdActionRowB, fourthActionRowB);

            await interaction.showModal(modalBuilder);
            Ticket.findOne({ Guild: guildId, MessageID: message.id, Ticket: "staff-first" }, async (err, data) => {
              message.edit({ content: null });
            });
            break;

          case "developer":
            if (interaction.isButton()) return;
            if (interaction.isChatInputCommand()) return;

            const modalDeveloper = new ModalBuilder().setCustomId("dev").setTitle("Prosimo, da nam posredujete več informacij");

            const izkusnjeDeveloper = new TextInputBuilder().setCustomId("izkusnjeDev").setLabel("Vaše dosedanje izkušnje").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(30).setMaxLength(4000);

            const zakajDeveloper = new TextInputBuilder().setCustomId("zakajDev").setLabel("Zakaj bi izbrali ravno tebe?").setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(30).setMaxLength(1024);

            const langDeveloper = new TextInputBuilder().setCustomId("langDev").setLabel("V katerih jezikih najpogosteje delate?").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("Java, C#, C++, Js, itd.").setMaxLength(400);

            const portfolio = new TextInputBuilder().setCustomId("portDev").setLabel("Link do vašega porfolia").setStyle(TextInputStyle.Short).setPlaceholder("Github, Website, itd.").setMaxLength(400);

            const secondActionRowD = new ActionRowBuilder().addComponents(izkusnjeDeveloper);
            const thirdActionRowD = new ActionRowBuilder().addComponents(zakajDeveloper);
            const fourthActionRowD = new ActionRowBuilder().addComponents(langDeveloper);
            const fifthActionRowD = new ActionRowBuilder().addComponents(portfolio);

            modalDeveloper.addComponents(secondActionRowD, thirdActionRowD, fourthActionRowD, fifthActionRowD);

            await interaction.showModal(modalDeveloper);
            Ticket.findOne({ Guild: guildId, MessageID: message.id, Ticket: "staff-first" }, async (err, data) => {
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
        case "helper":
          const nameMChelper = fields.getTextInputValue("nameMChelper");
          const izkusnjeHelper = fields.getTextInputValue("izkusnjeHelper");
          const zakajHelper = fields.getTextInputValue("zakajHelper");

          const embedH = new EmbedBuilder()
            .setAuthor({ name: `Nova Helper Prijava: ${interaction.user.tag}`, iconURL: "https://cdn.discordapp.com/attachments/1047634549644992624/1089644324435795988/sos.png" })
            .setThumbnail(`https://cdn.discordapp.com/attachments/1047634549644992624/1089456752430419968/slimey.png`)
            .setColor("Green")
            .setTitle("Izkušnje:")
            .setDescription(`${izkusnjeHelper}`)
            .addFields({ name: `Zakaj misli, da je primeren:`, value: `${zakajHelper}` })
            .addFields({ name: `Ime v Minecraftu:`, value: `${nameMChelper}` });

          const buttonsH = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("helper-sprejmi").setLabel("Sprejmi Trial-Helper").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("helper-zavrni").setLabel("Zavrni").setStyle(ButtonStyle.Danger),
          );

          await Ticket.findOne({ Guild: guildId, Ticket: "staff-first" }, async (err, data) => {
            if (!data) return Reply(interaction, "Red", "❌", "No Staff system found", true);
            const channelid = data.Notify;

            try {
              const channel = client.channels.cache.get(channelid);

              const msgH = await channel.send({ embeds: [embedH], components: [buttonsH] });
              await Staff.create({
                Guild: guildId,
                ChannelID: channel,
                MessageID: msgH.id,
                TicketID: "None",
                TicketMessageID: "None",
                UserID: user.id,
                Username: user.username,
              });
              Reply(interaction, "Green", "✅", "Vaša prijava je oddana.", true);
            } catch (error) {
              console.error(error);
            }
          });
          break;
        case "builder":
          const nameMCbuilder = fields.getTextInputValue("nameMCbuilder");
          const izkusnjeBuilder = fields.getTextInputValue("izkusnjeBuilder");
          const zakajBuilder = fields.getTextInputValue("zakajBuilder");
          const stilBuilder = fields.getTextInputValue("stilBuilder");

          const embedB = new EmbedBuilder()
            .setAuthor({ name: `Nova Builder Prijava: ${interaction.user.tag}`, iconURL: "https://cdn.discordapp.com/attachments/1047634549644992624/1089645463596187749/builder.png" })
            .setThumbnail(`https://cdn.discordapp.com/attachments/1047634549644992624/1089456752430419968/slimey.png`)
            .setColor("Yellow")
            .setTitle(`Izkušnje:`)
            .setDescription(`${izkusnjeBuilder}`)
            .addFields({ name: `Zakaj misli, da je primeren`, value: `${zakajBuilder}` })
            .addFields({ name: `Stil`, value: `${stilBuilder}` })
            .addFields({ name: `Ime v MC`, value: `${nameMCbuilder}` });

          const buttonsB = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("builder-sprejmi").setLabel("Sprejmi Trial-Builder").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("builder-zavrni").setLabel("Zavrni").setStyle(ButtonStyle.Danger),
          );

          await Ticket.findOne({ Guild: guildId, Ticket: "staff-first" }, async (err, data) => {
            if (!data) return Reply(interaction, "Red", "❌", "No Staff system found", true);
            const channelid = data.Notify;

            try {
              const channel = client.channels.cache.get(channelid);

              const msgB = await channel.send({ embeds: [embedB], components: [buttonsB] });
              await Staff.create({
                Guild: guildId,
                ChannelID: channel,
                MessageID: msgB.id,
                TicketID: "None",
                TicketMessageID: "None",
                UserID: user.id,
                Username: user.username,
              });
              Reply(interaction, "Green", "✅", "Vaša prijava je oddana.", true);
            } catch (error) {
              console.error(error);
            }
          });
          break;
        case "dev":
          const izkusnjeDeveloper = fields.getTextInputValue("izkusnjeDev");
          const zakajDeveloper = fields.getTextInputValue("zakajDev");
          const langDeveloper = fields.getTextInputValue("langDev");
          const portfolio = fields.getTextInputValue("portDev");

          const embedD = new EmbedBuilder()
            .setAuthor({ name: `Nova Developer Prijava: ${interaction.user.tag}`, iconURL: "https://cdn.discordapp.com/attachments/1047634549644992624/1089646057769668791/dev.png" })
            .setThumbnail(`https://cdn.discordapp.com/attachments/1047634549644992624/1089456752430419968/slimey.png`)
            .setColor("LuminousVividPink")
            .setTitle("Izkušnje:")
            .setDescription(`${izkusnjeDeveloper}`)
            .addFields({ name: `Zakaj misli, da je primeren`, value: `${zakajDeveloper}` })
            .addFields({ name: `Jeziki`, value: `${langDeveloper}` })
            .addFields({ name: `Portfolio`, value: `${portfolio}` });

          const buttonsD = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("dev-sprejmi").setLabel("Sprejmi Trial-Dev").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("dev-zavrni").setLabel("Zavrni").setStyle(ButtonStyle.Danger),
          );

          await Ticket.findOne({ Guild: guildId, Ticket: "staff-first" }, async (err, data) => {
            if (!data) return Reply(interaction, "Red", "❌", "No Staff system found", true);
            const channelid = data.Notify;

            try {
              const channel = client.channels.cache.get(channelid);

              const msgD = await channel.send({ embeds: [embedD], components: [buttonsD] });
              await Staff.create({
                Guild: guildId,
                ChannelID: channel,
                MessageID: msgD.id,
                TicketID: "None",
                TicketMessageID: "None",
                UserID: user.id,
                Username: user.username,
              });
              Reply(interaction, "Green", "✅", "Vaša prijava je oddana.", true);
            } catch (error) {
              console.error(error);
            }
          });
          break;
      }
    }
  },
};
