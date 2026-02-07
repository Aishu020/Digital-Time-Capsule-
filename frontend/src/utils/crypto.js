const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase, salt) {
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256"
    },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(plainText, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(plainText)
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    meta: {
      salt: bufferToBase64(salt.buffer),
      iv: bufferToBase64(iv.buffer),
      alg: "AES-GCM",
      kdf: "PBKDF2"
    }
  };
}

export async function decryptText(ciphertext, meta, passphrase) {
  const salt = new Uint8Array(base64ToBuffer(meta.salt));
  const iv = new Uint8Array(base64ToBuffer(meta.iv));
  const key = await deriveKey(passphrase, salt);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBuffer(ciphertext)
  );

  return textDecoder.decode(plainBuffer);
}

export async function encryptFile(file, passphrase) {
  const buffer = await file.arrayBuffer();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    buffer
  );

  const encryptedBlob = new Blob([cipherBuffer], { type: "application/octet-stream" });
  return {
    encryptedBlob,
    meta: {
      salt: bufferToBase64(salt.buffer),
      iv: bufferToBase64(iv.buffer),
      alg: "AES-GCM",
      kdf: "PBKDF2",
      originalName: file.name,
      originalType: file.type,
      originalSize: file.size
    }
  };
}

export function exportBufferToBase64(buffer) {
  return bufferToBase64(buffer);
}

export { base64ToBuffer };
