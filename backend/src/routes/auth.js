import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, displayName, clientPublicKey } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    displayName: displayName || "",
    clientPublicKey: clientPublicKey || ""
  });

  const token = jwt.sign({ sub: user._id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });

  return res.status(201).json({ token });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ sub: user._id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });

  return res.json({ token });
});

export default router;
