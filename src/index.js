require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const asyncHandler = require("./utils/asyncHandler");
const errorHandler = require("./middlewares/errorHandler");
const upload = require("./middlewares/uploadMiddleware");
const authenticateUser = require("./middlewares/authMiddleware");
const fs = require("fs");

// Ensure the uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Register User
app.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400);
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    res.json({ status: true, data: user });
  })
);

// Login User
app.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400);
      throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ status: true, data: token });
  })
);

// Get all posts
app.get(
  "/posts",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const posts = await prisma.post.findMany({
      include: { author: true },
    });
    res.json({ status: true, data: posts });
  })
);

// Create a new post
app.post(
  "/posts",
  authenticateUser,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const { title, content, authorId } = req.body;
    if (!req.file) {
      return res.status(400).json({ status: false, error: "No file uploaded" });
    }
    const image = `/uploads/${req.file.filename}`;
    const post = await prisma.post.create({
      data: { title, content, authorId, image },
    });
    res.json({ status: true, data: post });
  })
);

// Use global error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
