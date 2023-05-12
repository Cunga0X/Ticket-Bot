const { Client } = require("discord.js");
const { Events } = require("../Structures/Validation/EventNames");
const chalk = require("chalk");

/**
 * @param {Client} client
 */
module.exports = async (client, PG, Ascii) => {
	const Table = new Ascii("Events Loaded");

	const EventFiles = await PG(`${process.cwd()}/Events/*/*.js`);

	EventFiles.map(async (file) => {
		const event = require(file);

		if (!Events.includes(event.name) || !event.name) {
			const L = file.split("/");

			await Table.addRow(`${event.name || "MISSING"}`, `🟥 Event Name is either invalid or missing: ${L[6] + `/` + L[7]}`);
			return;
		}

		if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
		else client.on(event.name, (...args) => event.execute(...args, client));

		await Table.addRow(event.name, "🟩", "Successfull");
	});

	console.log(chalk.magenta(Table.toString()));
};
