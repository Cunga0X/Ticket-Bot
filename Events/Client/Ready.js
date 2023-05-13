const { Client } = require("discord.js");
const ms = require("ms");
const mongoose = require("mongoose");
const config = require("../../config.js");
const chalk = require("chalk");
const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const { version: current } = require("../../package.json");

module.exports = {
  name: "ready",

  /**
   * @param {Client} client
   */
  async execute(client) {
    const { user, ws } = client;

    if (config.TICKETS_HISTORY === "web") {
      let app = express();
      app.use("/History", express.static(path.join(__dirname, "../../History")));

      app.get("/", (req, res) => {
        const directoryPath = path.join(__dirname, "../../History");
        fs.readdir(directoryPath, function (err, files) {
          if (err) {
            return console.log("Unable to scan directory: " + err);
          }
          files.forEach(function (file) {
            if (path.extname(file) === ".html") {
              res.sendFile(path.join(__dirname + "../../History/" + file));
            }
          });
        });
      });

      app.listen(config.PORT);
      console.log(chalk.green("Ticket's server Online"));
    }

    setInterval(() => {
      user.setActivity({
        name: `slomc.si`,
        type: 0,
      });
    }, ms("5s"));

    if (!config.MONGO_DB) return;

    mongoose.set("strictQuery", false);
    mongoose
      .connect(config.MONGO_DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => {
        console.log(chalk.green("Connected to MongoDB"));
        console.log(chalk.green(`\n${user.tag} is now online!`));
      })
      .catch((err) => {
        console.error(chalk.red(`Failed to connect to MongoDB: ${err}`));
      });
    if (config.UPDATE_NOTICE == false) return;
    const semver = await import("semver");

    const data = await axios.get("https://api.github.com/repos/Cunga0X/Ticket-Bot/releases").catch((error) => {
      console.error(error);
    });

    const latest = semver.coerce(data.data[0].tag_name);

    if (!semver.valid(latest)) {
      console.log("You are up to date");
    }

    if (semver.lt(current, latest)) {
      console.log(chalk.yellow(`There is an update available for Discord Tickets (${current} -> ${latest})`));

      const linkUrl = "https://github.com/Cunga0X/Ticket-Bot/releases";

      const lines = [`You are currently using ${current}, the latest is ${latest}.`, `Download "${latest}" from the GitHub releases page: ${linkUrl}`];

      console.log(chalk.yellow(lines.join("\n")));
    }
  },
};
