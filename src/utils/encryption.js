import crypto from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex"); // Must be 32 bytes
const ENCRYPTION_IV = Buffer.from(process.env.ENCRYPTION_IV, "hex"); // Must be 16 bytes for deterministic

// Randomized Encryption (for Name and other non-unique fields)
export function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text) {
  if (!text) return text;
  // Check if text is in expected format (iv:encrypted)
  const textParts = text.split(":");
  if (textParts.length !== 2) return text; // return original if not encrypted format

  try {
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // If decryption fails (maybe it wasn't encrypted or wrong key), return original
    return text;
  }
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
