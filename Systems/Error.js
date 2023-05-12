const { EmbedBuilder } = require("discord.js");

/**
 * @param {*} interaction - client interaction from Command Interaction
 * @param {String} description - description for the reply
 * @param {Boolean} type - type of reply, ephemeral true or false
 */
function Reply(interaction, description, type) {
	interaction.reply({
		embeds: [new EmbedBuilder().setColor("Red").setDescription(`❌ ・ ${description}`)],
		ephemeral: type,
	});
}

module.exports = Reply;
