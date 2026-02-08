const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Joi, validateBody } = require("../middleware/validation");

const registerSchema = Joi.object({
  username: Joi.string().trim().min(2).max(40).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).max(100).required(),
  phone: Joi.string().allow("").max(30),
  city: Joi.string().allow("").max(60)
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).required()
});

//reg
router.post("/register", validateBody(registerSchema), async (req, res) => {
  try {
    const { username, email, password, phone = "", city = "" } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      phone,
      city
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

//login
router.post("/login", validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
