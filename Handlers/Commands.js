const { Perms } = require("../Structures/Validation/Permissions");
const chalk = require("chalk");
const { Client } = require("discord.js");
const ms = require("ms");

/**
 * @param { Client } client
 */
module.exports = async (client, PG, Ascii) => {
	const Table = new Ascii("Commands Loaded");

	CommandsArray = [];

	const CommandFiles = await PG(`${process.cwd()}/Commands/*/*.js`);

	CommandFiles.map(async (file) => {
		const command = require(file);

		if (!command.name) return Table.addRow(file.split("/")[7], "🟥", "Missing a name");

		if (!command.context && !command.description) return Table.addRow(command.name, "🟥", "Missing a description");

		if (command.UserPerms)
			if (command.UserPerms.every((perms) => Perms.includes(perms))) command.default_member_permissions = false;
			else return Table.addRow(command.name, "🟥", "User Permission is invalid");

		client.commands.set(command.name, command);
		CommandsArray.push(command);

		await Table.addRow(command.name, "🟩", "Successfull");
	});

	console.log(chalk.magenta(Table.toString()));

	client.on("ready", () => {
		setInterval(() => {
			client.guilds.cache.forEach((guild) => {
				guild.commands.set(CommandsArray);
			});
		}, ms("5s"));
	});
};
