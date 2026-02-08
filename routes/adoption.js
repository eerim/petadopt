const express = require("express");
const router = express.Router();

const Adoption = require("../models/adoption");
const auth = require("../middleware/authmid");

router.get("/my", auth, async (req, res) => {
  const adoptions = await Adoption.find({ userId: req.user.id })
    .populate("petId");

  res.json(adoptions);
});

module.exports = router;
module.exports = router;
