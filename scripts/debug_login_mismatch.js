import { encryptDeterministic } from "../src/utils/encryption.js";
import "dotenv/config";

function testMismatch() {
  const emailMixed = "User@Test.com";
  const emailLower = "user@test.com";

  const encMixed = encryptDeterministic(emailMixed);
  const encLower = encryptDeterministic(emailLower);

  console.log(`Email Mixed: ${emailMixed}`);
  console.log(`Encrypted Mixed: ${encMixed}`);

  console.log(`Email Lower: ${emailLower}`);
  console.log(`Encrypted Lower: ${encLower}`);

  if (encMixed !== encLower) {
    console.log("MISMATCH DETECTED: Encryption is case-sensitive.");
    console.log("If DB has Mixed case, Lower case login will fail.");
  } else {
    console.log("MATCH: Encryption is case-insensitive (unexpected).");
  }
}

testMismatch();
