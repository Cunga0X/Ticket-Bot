const { model, Schema } = require("mongoose");

let TicketStats = new Schema({
  Guild: String,
  StaffMember: String,
  Messages: Number,
});

module.exports = model("TicketStats", TicketStats);
