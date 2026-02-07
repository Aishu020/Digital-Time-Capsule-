import { promises as fs } from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

const s3Client = config.storageProvider === "s3"
  ? new S3Client({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey
      }
    })
  : null;

async function ensureLocalPath() {
  await fs.mkdir(config.localStoragePath, { recursive: true });
}

export async function storeAttachment({ buffer, filename, mimeType }) {
  if (config.storageProvider === "s3") {
    const key = `capsules/${Date.now()}-${filename}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.awsBucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType
      })
    );
    return { storageProvider: "s3", storageKey: key };
  }

  await ensureLocalPath();
  const key = `${Date.now()}-${filename}`;
  const fullPath = path.join(config.localStoragePath, key);
  await fs.writeFile(fullPath, buffer);
  return { storageProvider: "local", storageKey: key };
}
