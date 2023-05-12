const { model, Schema } = require("mongoose");

let Staff = new Schema({
	Guild: String,
	ChannelID: String,
	UserID: String,
	MessageID: String,
	TicketID: String,
	Username: String,
	TicketMessageID: String,
});

module.exports = model("Staff", Staff);
