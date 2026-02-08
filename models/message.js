const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      default: null
    },
    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ participants: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
