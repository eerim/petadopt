const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const adoptionRoutes = require("./routes/adoption");

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5001",
    "http://localhost:5500",
    "https://petadopt-x17x.onrender.com"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.json());

connectDB();


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.use(express.static(path.join(__dirname, "frontend")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/userroutes"));
app.use("/api/pets", require("./routes/petroutes"));
app.use("/api/external", require("./routes/external"));
app.use("/api/adoptions", require("./routes/adoption"));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Server error"
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
