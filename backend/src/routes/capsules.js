import express from "express";
import multer from "multer";
import { Capsule } from "../models/Capsule.js";
import { authRequired } from "../middleware/auth.js";
import { hashSecret, randomSecret } from "../utils/crypto.js";
import { storeAttachment } from "../services/storageService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authRequired, async (req, res) => {
  const { title, message, encryptedPayload, payloadMeta, triggerType, unlockAt, recipients } = req.body;
  if (!title || !encryptedPayload) {
    return res.status(400).json({ error: "Title and encrypted payload are required" });
  }

  if ((triggerType || "date") === "date" && !unlockAt) {
    return res.status(400).json({ error: "unlockAt is required for date trigger" });
  }

  const recipientTokens = (recipients || []).map((email) => {
    const accessId = randomSecret(12);
    const accessSecret = randomSecret(24);
    return { email, accessId, accessSecret };
  });

  const capsule = await Capsule.create({
    owner: req.user.sub,
    title,
    message: message || "",
    encryptedPayload,
    payloadMeta: payloadMeta || {},
    triggerType: triggerType || "date",
    unlockAt: triggerType === "date" ? new Date(unlockAt) : null,
    recipients: recipientTokens.map((entry) => ({
      email: entry.email,
      accessId: entry.accessId,
      accessSecretHash: hashSecret(entry.accessSecret)
    }))
  });

  const accessTokens = recipientTokens;

  return res.status(201).json({ capsuleId: capsule._id, accessTokens });
});

router.get("/", authRequired, async (req, res) => {
  const capsules = await Capsule.find({ owner: req.user.sub }).sort({ createdAt: -1 });
  return res.json(capsules);
});

router.get("/:id", authRequired, async (req, res) => {
  const capsule = await Capsule.findOne({ _id: req.params.id, owner: req.user.sub });
  if (!capsule) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.json(capsule);
});

router.post("/:id/attachments", authRequired, upload.single("file"), async (req, res) => {
  const capsule = await Capsule.findOne({ _id: req.params.id, owner: req.user.sub });
  if (!capsule) {
    return res.status(404).json({ error: "Not found" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "File is required" });
  }

  const storage = await storeAttachment({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    mimeType: req.file.mimetype
  });

  capsule.attachments.push({
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageProvider: storage.storageProvider,
    storageKey: storage.storageKey
  });
  await capsule.save();

  return res.status(201).json({ attachment: capsule.attachments[capsule.attachments.length - 1] });
});

router.post("/:id/share", authRequired, async (req, res) => {
  const { recipients } = req.body;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "Recipients array is required" });
  }

  const capsule = await Capsule.findOne({ _id: req.params.id, owner: req.user.sub });
  if (!capsule) {
    return res.status(404).json({ error: "Not found" });
  }

  const accessTokens = recipients.map((email) => {
    const accessId = randomSecret(12);
    const accessSecret = randomSecret(24);
    capsule.recipients.push({
      email,
      accessId,
      accessSecretHash: hashSecret(accessSecret)
    });
    return { email, accessId, accessSecret };
  });

  await capsule.save();
  return res.json({ accessTokens });
});

router.post("/:id/trigger", authRequired, async (req, res) => {
  const capsule = await Capsule.findOne({ _id: req.params.id, owner: req.user.sub });
  if (!capsule) {
    return res.status(404).json({ error: "Not found" });
  }

  capsule.status = "released";
  capsule.releasedAt = new Date();
  await capsule.save();

  return res.json({ status: capsule.status, releasedAt: capsule.releasedAt });
});

router.post("/access/:accessId", async (req, res) => {
  const { accessSecret } = req.body;
  if (!accessSecret) {
    return res.status(400).json({ error: "Access secret required" });
  }

  const capsule = await Capsule.findOne({ "recipients.accessId": req.params.accessId });
  if (!capsule) {
    return res.status(404).json({ error: "Not found" });
  }

  if (capsule.status !== "released") {
    return res.status(403).json({ error: "Capsule not released yet" });
  }

  const recipient = capsule.recipients.find((entry) => entry.accessId === req.params.accessId);
  if (!recipient || recipient.accessSecretHash !== hashSecret(accessSecret)) {
    return res.status(401).json({ error: "Invalid access" });
  }

  recipient.status = "accessed";
  await capsule.save();

  return res.json({
    capsule: {
      title: capsule.title,
      message: capsule.message,
      encryptedPayload: capsule.encryptedPayload,
      payloadMeta: capsule.payloadMeta,
      attachments: capsule.attachments
    }
  });
});

export default router;
