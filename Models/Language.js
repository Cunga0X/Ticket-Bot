const { model, Schema } = require("mongoose");

let CreateLang = new Schema({
	guild: String,
	language: String,
});

module.exports = model("Language", CreateLang);
