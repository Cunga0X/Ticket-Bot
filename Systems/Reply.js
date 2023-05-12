const { EmbedBuilder } = require("discord.js");

/**
 * @param {*} color
 * @param {*} interaction - client interaction from Command Interaction
 * @param {*} emoji - emoji for the reply
 * @param {String} description - description for the reply
 * @param {Boolean} type - type of reply, ephemeral true or false
 */
function Reply(interaction, color, emoji, description, type) {
	interaction.reply({
		embeds: [new EmbedBuilder().setColor(color).setDescription(`${emoji} ・ ${description}`)],
		ephemeral: type,
	});
}

module.exports = Reply;
