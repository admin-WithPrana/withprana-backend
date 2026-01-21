import "dotenv/config";
import crypto from "crypto";

console.log("----------------------------------------------------------------");
console.log("Starting Encryption Logic Verification");
console.log("----------------------------------------------------------------");

// Check and Mock Env Vars if needed
if (!process.env.ENCRYPTION_KEY) {
  console.warn(
    "⚠️ ENCRYPTION_KEY not found in .env. Using MOCK key for testing."
  );
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
}
if (!process.env.ENCRYPTION_IV) {
  console.warn(
    "⚠️ ENCRYPTION_IV not found in .env. Using MOCK IV for testing."
  );
  process.env.ENCRYPTION_IV = crypto.randomBytes(16).toString("hex");
}

// Dynamic import to ensure env vars are set before module loads
const { encrypt, decrypt, generateUserKey, encryptUserKey, decryptUserKey } =
  await import("../src/utils/encryption.js");

async function runTests() {
  // 1. Verify User Key Generation and Encryption
  console.log("\n1. Testing Key Generation and Key Encryption...");
  const userKey = generateUserKey();
  console.log("Generated User Key (hex):", userKey);

  try {
    const encryptedUserKey = encryptUserKey(userKey);
    console.log("Encrypted User Key:", encryptedUserKey);

    const decryptedUserKey = decryptUserKey(encryptedUserKey);
    console.log("Decrypted User Key:", decryptedUserKey);

    if (userKey === decryptedUserKey) {
      console.log("✅ Key Encryption/Decryption Success");
    } else {
      console.error("❌ Key Encryption/Decryption Failed!");
      process.exit(1);
    }

    // 2. Verify Data Encryption with User Key
    console.log("\n2. Testing Data Encryption with User Key...");
    const sensitiveData = "Antigravity Secret Data";

    // Encrypt with user key
    const encryptedData = encrypt(sensitiveData, userKey);
    console.log("Original Data:", sensitiveData);
    console.log("Encrypted Data (with UserKey):", encryptedData);

    // Decrypt with user key
    const decryptedData = decrypt(encryptedData, userKey);
    console.log("Decrypted Data (with UserKey):", decryptedData);

    if (sensitiveData === decryptedData) {
      console.log("✅ Data Encryption/Decryption (User Key) Success");
    } else {
      console.error("❌ Data Encryption/Decryption (User Key) Failed!");
      process.exit(1);
    }

    // 3. Verify Fallback (Master Key) - Legacy Support
    console.log("\n3. Testing Legacy Support (Master Key)...");
    const legacyData = encrypt(sensitiveData); // Uses default Master Key
    const legacyDecrypted = decrypt(legacyData); // Uses default Master Key

    if (sensitiveData === legacyDecrypted) {
      console.log("✅ Legacy Encryption/Decryption (Master Key) Success");
    } else {
      console.error("❌ Legacy Encryption/Decryption Failed!");
      process.exit(1);
    }

    // 4. Verify Mix (User Key encrypted data, Master Key decrypt attempt) -> Should Fail/Garbage
    console.log(
      "\n4. Testing Security (Master Key cannot decrypt User Key data)..."
    );
    const mixedDecrypted = decrypt(encryptedData); // Try decrypting user-key-encrypted data with Master Key
    if (mixedDecrypted !== sensitiveData) {
      console.log(
        "✅ Security Success: Master Key could not decrypt User Key data correctly"
      );
    } else {
      console.error(
        "❌ Security Fail: Master Key DECRYPTED User Key data! (Keys might be same or logic error)"
      );
    }
  } catch (error) {
    console.error("❌ Unexpected Error:", error);
    process.exit(1);
  }

  console.log(
    "\n----------------------------------------------------------------"
  );
  console.log("🎉 All Logic Verification Tests Passed!");
  console.log(
    "----------------------------------------------------------------"
  );
}

runTests();
