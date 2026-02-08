const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Message = require("../models/message");
const User = require("../models/user");
const auth = require("../middleware/authmid");
const { Joi, validateBody } = require("../middleware/validation");

const messageSchema = Joi.object({
  text: Joi.string().trim().min(1).max(1000).required(),
  petId: Joi.string().optional()
});

router.use(auth);

router.get("/threads", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({
      participants: userId
    })
      .sort({ createdAt: -1 })
      .populate("sender", "username city phone")
      .populate("receiver", "username city phone")
      .lean();

    const summaries = new Map();

    messages.forEach(msg => {
      const senderId = msg.sender._id.toString();
      const receiverId = msg.receiver._id.toString();
      const counterpart =
        senderId === userId ? msg.receiver : msg.sender;
      const key = counterpart._id.toString();

      if (!summaries.has(key)) {
        summaries.set(key, {
          counterpart: {
            id: key,
            name: counterpart.username || "Pet Owner",
            city: counterpart.city || "",
            phone: counterpart.phone || ""
          },
          lastMessage: {
            text: msg.text,
            timestamp: msg.createdAt,
            authorId: senderId
          },
          unread: 0
        });
      }

      if (receiverId === userId && !msg.read) {
        const summary = summaries.get(key);
        summary.unread = (summary.unread || 0) + 1;
      }
    });

    res.json(Array.from(summaries.values()));
  } catch (err) {
    next(err);
  }
});

router.get("/with/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const messages = await Message.find({
      participants: { $all: [req.user.id, userId] }
    })
      .sort({ createdAt: 1 })
      .lean();

    await Message.updateMany(
      {
        participants: { $all: [req.user.id, userId] },
        receiver: req.user.id,
        read: false
      },
      { read: true }
    );

    res.json(messages.map(msg => ({
      id: msg._id,
      text: msg.text,
      timestamp: msg.createdAt,
      authorId: msg.sender.toString(),
      read: msg.read
    })));
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:userId",
  validateBody(messageSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot message yourself" });
      }

      const recipient = await User.findById(userId).select("username city phone");
      if (!recipient) {
        return res.status(404).json({ message: "User not found" });
      }

      const message = await Message.create({
        participants: [req.user.id, userId],
        sender: req.user.id,
        receiver: userId,
        text: req.body.text,
        petId: req.body.petId || null
      });

      res.status(201).json({
        id: message._id,
        text: message.text,
        timestamp: message.createdAt,
        authorId: req.user.id,
        receiverId: userId
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
