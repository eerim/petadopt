const express = require("express");
const router = express.Router();
const Pet = require("../models/pet");
const User = require("../models/user");
const Adoption = require("../models/adoption");
const multer = require("multer");
const authMiddleware = require("../middleware/authmid");
const { Joi, validateBody } = require("../middleware/validation");


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

const petCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  type: Joi.string().trim().min(2).max(40).required(),
  age: Joi.number().integer().min(0).max(30).required()
});

const petUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60),
  type: Joi.string().trim().min(2).max(40),
  age: Joi.number().integer().min(0).max(30),
  status: Joi.string().valid("available", "adopted", "pending")
}).min(1);

const adoptionSchema = Joi.object({
  note: Joi.string().allow("").max(300).optional()
});

const requestStatusSchema = Joi.object({
  status: Joi.string().valid("approved", "declined").required()
});


router.get("/", async (req, res) => {
  try {
    const pets = await Pet.find()
      .sort({ createdAt: -1, _id: -1 })
      .populate("createdBy", "username email phone city");
    res.json(pets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/owner/:ownerId", async (req, res) => {
  try {
    const pets = await Pet.find({ createdBy: req.params.ownerId })
      .sort({ createdAt: -1, _id: -1 })
      .populate("createdBy", "username email phone city");
    res.json(pets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/my", authMiddleware, async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id });
    res.json(pets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  validateBody(petCreateSchema),
  async (req, res) => {
    try {
      const pet = new Pet({
        name: req.body.name,
        type: req.body.type,
        age: req.body.age,
        image: req.file
          ? `/uploads/${req.file.filename}`
          : req.body.image || "",
        createdBy: req.user.id
      });

      await pet.save();
      res.status(201).json(pet);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create pet" });
    }
  }
);


router.post("/:id/favorite", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const petId = req.params.id;

    const index = user.favorites.indexOf(petId);

    if (index === -1) {
      user.favorites.push(petId);
    } else {
      user.favorites.splice(index, 1);
    }

    await user.save();
    res.json({ favorited: index === -1 });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.post(
  "/:id/adopt",
  authMiddleware,
  validateBody(adoptionSchema),
  async (req, res) => {
    try {
      const pet = await Pet.findById(req.params.id);

      if (!pet) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.createdBy?.toString() === req.user.id) {
        return res.status(400).json({ message: "You cannot request your own pet" });
      }

      if (pet.status === "adopted") {
        return res.status(400).json({ message: "Pet already adopted" });
      }

      const existingRequest = await Adoption.findOne({
        petId: pet._id,
        userId: req.user.id,
        status: { $in: ["pending", "approved"] }
      });

      if (existingRequest) {
        return res.status(400).json({
          message:
            existingRequest.status === "approved"
              ? "Request already approved"
              : "Request already pending"
        });
      }

      const adoption = await Adoption.create({
        petId: pet._id,
        userId: req.user.id,
        note: req.body.note || ""
      });

      res.status(201).json({ message: "Request submitted", request: adoption });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


router.get("/:id/requests", authMiddleware, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    if (pet.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const requests = await Adoption.find({ petId: pet._id })
      .sort({ createdAt: -1 })
      .populate("userId", "username city phone");

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.put(
  "/:petId/requests/:requestId",
  authMiddleware,
  validateBody(requestStatusSchema),
  async (req, res) => {
    try {
      const pet = await Pet.findById(req.params.petId);
      if (!pet) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.createdBy?.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not allowed" });
      }

      const request = await Adoption.findById(req.params.requestId);
      if (!request || request.petId.toString() !== pet._id.toString()) {
        return res.status(404).json({ message: "Request not found" });
      }

      const { status } = req.body;
      request.status = status;
      await request.save();

      if (status === "approved") {
        pet.status = "adopted";
        pet.owner = request.userId;
        await pet.save();

        await Adoption.updateMany(
          { petId: pet._id, _id: { $ne: request._id }, status: "pending" },
          { status: "declined" }
        );
      }

      res.json({ message: "Request updated", request });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


router.get("/my-with-date", authMiddleware, async (req, res) => {
  try {
    const adoptions = await Adoption.find({
      userId: req.user.id,
      status: "approved"
    });
    res.json(adoptions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  validateBody(petUpdateSchema),
  async (req, res) => {
    try {
      const pet = await Pet.findById(req.params.id);

      if (!pet) {
        return res.status(404).json({ message: "Pet not found" });
      }

      if (pet.createdBy?.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not allowed" });
      }

      const updates = {
        name: req.body.name ?? pet.name,
        type: req.body.type ?? pet.type,
        age: req.body.age ?? pet.age,
        status: req.body.status ?? pet.status
      };

      if (req.file) {
        updates.image = `/uploads/${req.file.filename}`;
      }

      Object.assign(pet, updates);
      await pet.save();

      res.json(pet);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    if (pet.createdBy && pet.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await pet.deleteOne();
    res.json({ message: "Pet deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id)
      .populate("createdBy", "username email phone city");

    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    res.json(pet);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;