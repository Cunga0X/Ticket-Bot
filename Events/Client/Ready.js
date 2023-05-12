const { Client } = require("discord.js");
const ms = require("ms");
const mongoose = require("mongoose");
const { MONGO_DB, TICKETS_HISTORY, PORT } = require("../../config.js");
const chalk = require("chalk");
const express = require("express");
const path = require("path");
const fs = require("fs");

module.exports = {
  name: "ready",

  /**
   * @param {Client} client
   */
  async execute(client) {
    const { user, ws } = client;

    if (TICKETS_HISTORY === "web") {
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

      app.listen(PORT);
    }

    setInterval(() => {
      user.setActivity({
        name: `slomc.si`,
        type: 0,
      });
    }, ms("5s"));

    console.log(chalk.green("Ticket's server Online"));

    if (!MONGO_DB) return;

    mongoose.set("strictQuery", false);
    mongoose
      .connect(MONGO_DB, {
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
  },
};
