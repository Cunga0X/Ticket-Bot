const { resolve } = require("path");

module.exports = {
  TOKEN: "your token",
  LOGS: "channel for error logs",
  MONGO_DB: "your mongodb uri",

  LANGUAGE: {
    defaultLocale: "en", // "en" = default language
    directory: resolve("Languages"), // <= location of language
  },

  // Options "web" or "local"
  TICKETS_HISTORY: "local",

  //WEBSERVER CONFIG
  PORT: 443,
  FQDM: "my.domain.com",
};
