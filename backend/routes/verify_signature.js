const crypto = require('crypto');

// Data from your error log
const total_amount = "110";
const transaction_uuid = "ab14a8f2b02c3";
const product_code = "EPAYTEST";
const secret_key = "8gBm/:&EnhH.1/q"; // Standard test key

// 1. Construct the signature string
// Format: total_amount=110,transaction_uuid=ab14a8f2b02c3,product_code=EPAYTEST
const signatureData = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;

// 2. Generate Hash
const hash = crypto.createHmac('sha256', secret_key)
                   .update(signatureData)
                   .digest('base64');

console.log("---------------------------------------------------");
console.log("Constructed String: ", signatureData);
console.log("Generated Signature:", hash);
console.log("Expected Signature: ", "YVweM7CgAtZW5tRKica/BIeYFvpSj09AaInsulqNKHk="); // From your log
console.log("---------------------------------------------------");

if (hash === "YVweM7CgAtZW5tRKica/BIeYFvpSj09AaInsulqNKHk=") {
    console.log(" MATCH! Your backend logic is correct.");
    console.log("Issue is likely with the Secret Key or Environment (Sandbox vs Prod).");
} else {
    console.log(" MISMATCH! Your backend is generating a different signature.");
    console.log("Check the order of parameters or the secret key.");
}