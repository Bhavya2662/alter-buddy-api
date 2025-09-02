const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Get app access key and secret from environment
const app_access_key = process.env.REACT_APP_100ms_SDK_KEY;
const app_secret = process.env.REACT_APP_100ms_SDK_SECRET;

if (!app_access_key || !app_secret) {
    console.error('Missing 100ms credentials in .env file');
    console.error('Required: REACT_APP_100ms_SDK_KEY and REACT_APP_100ms_SDK_SECRET');
    process.exit(1);
}

// Create management token payload
const payload = {
    access_key: app_access_key,
    type: 'management',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000)
};

// Generate token with 7 days expiry (maximum recommended)
const token = jwt.sign(
    payload,
    app_secret,
    {
        algorithm: 'HS256',
        expiresIn: '7d',
        jwtid: uuidv4()
    }
);

console.log('\n=== 100ms Management Token Generated ===');
console.log('Token:', token);
console.log('\nExpires in: 7 days');
console.log('Generated at:', new Date().toISOString());

// Decode and display token info
const decoded = jwt.decode(token, { complete: true });
console.log('\n=== Token Details ===');
console.log('Access Key:', decoded.payload.access_key);
console.log('Type:', decoded.payload.type);
console.log('Version:', decoded.payload.version);
console.log('Issued At:', new Date(decoded.payload.iat * 1000).toISOString());
console.log('Expires At:', new Date(decoded.payload.exp * 1000).toISOString());

console.log('\n=== Next Steps ===');
console.log('1. Update REACT_APP_100MD_SDK_TOKEN in your .env file with this new token');
console.log('2. Restart your server to load the new token');
console.log('3. Test audio/video call bookings again');