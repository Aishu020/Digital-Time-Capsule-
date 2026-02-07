import mongoose from "mongoose";

const RecipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    accessId: { type: String, required: true },
    accessSecretHash: { type: String, required: true },
    status: { type: String, enum: ["pending", "notified", "accessed"], default: "pending" }
  },
  { _id: false }
);

const CapsuleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    encryptedPayload: { type: String, required: true },
    payloadMeta: {
      type: Object,
      default: {}
    },
    attachments: {
      type: [
        {
          name: String,
          mimeType: String,
          size: Number,
          storageProvider: String,
          storageKey: String
        }
      ],
      default: []
    },
    triggerType: { type: String, enum: ["date", "event"], default: "date" },
    unlockAt: { type: Date },
    status: { type: String, enum: ["pending", "released"], default: "pending" },
    releasedAt: { type: Date },
    recipients: { type: [RecipientSchema], default: [] }
  },
  { timestamps: true }
);

export const Capsule = mongoose.model("Capsule", CapsuleSchema);
