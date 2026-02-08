const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  age: Number,
  image: {
  type: String,
  required: true
},
  status: {
    type: String,
    default: "available"
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Pet", petSchema);