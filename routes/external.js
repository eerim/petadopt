const express = require("express");
const router = express.Router();


router.get("/cats", async (req, res) => {
  try {
    const r = await fetch(
      "https://api.thecatapi.com/v1/images/search?limit=9",
      {
        headers: {
          "x-api-key": process.env.CAT_API_KEY
        }
      }
    );
    const data = await r.json();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Cat API error" });
  }
});


router.get("/dogs", async (req, res) => {
  try {
    const r = await fetch(
      "https://dog.ceo/api/breeds/image/random/9"
    );
    const data = await r.json();
    res.json(data.message);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Dog API error" });
  }
});

module.exports = router;