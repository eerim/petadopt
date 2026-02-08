const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  phone: { type: String, default: "" },
  city: { type: String, default: "" },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pet" }]
});

module.exports = mongoose.model("User", userSchema);
