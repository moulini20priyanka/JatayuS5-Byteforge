// Save as backend/decode_token.js
// Run: node decode_token.js YOUR_TOKEN_HERE
// Get token from browser: localStorage.getItem('student_token')

const token = process.argv[2];
if (!token) {
  console.log('Usage: node decode_token.js <token>');
  console.log('Get token from browser console: localStorage.getItem("student_token")');
  process.exit(1);
}

// Decode without verifying (just inspect payload)
const parts = token.split('.');
if (parts.length !== 3) {
  console.error('Not a valid JWT');
  process.exit(1);
}

const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
console.log('\n=== JWT PAYLOAD ===');
console.log(JSON.stringify(payload, null, 2));
console.log('\n=== KEY FIELDS ===');
console.log('id field:',        payload.id);
console.log('student_id:',      payload.student_id);
console.log('userId:',          payload.userId);
console.log('email:',           payload.email);
console.log('student_email:',   payload.student_email);
console.log('role:',            payload.role);

// Also try to verify with common secrets
const secrets = ['secret','your_jwt_secret','jwt_secret','neuroassess','neuro','your-secret-key'];
try {
  const jwt = require('jsonwebtoken');
  const dotenv = require('dotenv');
  dotenv.config();
  
  const envSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
  if (envSecret) secrets.unshift(envSecret);

  let verified = false;
  for (const s of secrets) {
    try {
      const dec = jwt.verify(token, s);
      console.log(`\n✅ Verified with secret: "${s}"`);
      console.log('Decoded:', JSON.stringify(dec, null, 2));
      verified = true;
      break;
    } catch {}
  }
  if (!verified) console.log('\n❌ Could not verify — check JWT_SECRET in .env');
} catch (e) {
  console.log('\nCould not verify:', e.message);
}
