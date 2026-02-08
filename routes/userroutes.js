const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Pet = require("../models/pet");
const authMiddleware = require("../middleware/authmid");
const { Joi, validateBody } = require("../middleware/validation");

const profileSchema = Joi.object({
  username: Joi.string().trim().min(2).max(40),
  phone: Joi.string().allow("").max(30),
  city: Joi.string().allow("").max(60)
});

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.put(
  "/profile",
  authMiddleware,
  validateBody(profileSchema),
  async (req, res) => {
  try {
    const { username, phone, city } = req.body;

    const updates = {};
    if (typeof username === "string") updates.username = username;
    if (typeof phone === "string") updates.phone = phone;
    if (typeof city === "string") updates.city = city;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password");

    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id/public", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("username city phone createdAt");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/adopt", authMiddleware, async (req, res) => {
  const pet = await Pet.findById(req.params.id);

  if (!pet || pet.status === "adopted") {
    return res.status(400).json({ message: "Pet not available" });
  }

  pet.status = "adopted";
  pet.owner = req.user.id;
  await pet.save();

  res.json({ message: "Pet adopted 🐾" });
});

router.get("/favorites", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).populate("favorites");
  res.json(user.favorites);
});

module.exports = router;
