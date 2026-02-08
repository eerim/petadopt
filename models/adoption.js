const mongoose = require("mongoose");

const adoptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  petId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet", 
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "declined"],
    default: "pending"
  },
  note: {
    type: String,
    maxlength: 200
  }
}, { timestamps: true });

module.exports = mongoose.model("Adoption", adoptionSchema);
