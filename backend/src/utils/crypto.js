import crypto from "crypto";

export function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function randomSecret(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}
