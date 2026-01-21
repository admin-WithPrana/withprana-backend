import crypto from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex"); // Must be 32 bytes
const ENCRYPTION_IV = Buffer.from(process.env.ENCRYPTION_IV, "hex"); // Must be 16 bytes for deterministic

// Randomized Encryption (for Name and other non-unique fields)
export function encrypt(text, key = ENCRYPTION_KEY) {
  if (!text) return text;
  // Ensure key is Buffer
  const cipherKey = Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", cipherKey, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text, key = ENCRYPTION_KEY) {
  if (!text) return text;
  // Check if text is in expected format (iv:encrypted)
  const textParts = text.split(":");
  if (textParts.length !== 2) return text; // return original if not encrypted format

  try {
    // Ensure key is Buffer
    const decipherKey = Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");

    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", decipherKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // If decryption fails (maybe it wasn't encrypted or wrong key), return original
    return text;
  }
}

// User Key Management
export function generateUserKey() {
  return crypto.randomBytes(32).toString("hex");
}

export function encryptUserKey(userKey) {
  // Encrypt the user key with the MASTER KEY (ENCRYPTION_KEY)
  // We use the same random IV approach as encrypt()
  return encrypt(userKey, ENCRYPTION_KEY);
}

export function decryptUserKey(encryptedUserKey) {
  // Decrypt the user key with the MASTER KEY (ENCRYPTION_KEY)
  return decrypt(encryptedUserKey, ENCRYPTION_KEY);
}

// Deterministic Encryption (for Email - preserves equality for unique checks)
export function encryptDeterministic(text) {
  if (!text) return text;
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    ENCRYPTION_KEY,
    ENCRYPTION_IV
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
}

export function decryptDeterministic(text) {
  if (!text) return text;
  try {
    const encryptedText = Buffer.from(text, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      ENCRYPTION_KEY,
      ENCRYPTION_IV
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return text;
  }
}
