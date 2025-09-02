const jwt = require('jsonwebtoken');

const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTU1MTQyOTksImV4cCI6MTc1NjExOTA5OSwianRpIjoiZGE5ZjcyYjAtOGE1Zi00NDcxLWExNDYtY2VjZWYwOTNlZGFlIiwidHlwZSI6Im1hbmFnZW1lbnQiLCJ2ZXJzaW9uIjoyLCJuYmYiOjE3NTU1MTQyOTksImFjY2Vzc19rZXkiOiI2NmEwOTZjZmFkZDEyNjUxYTAyZjhiNjAifQ.NFwBrEIvlPCVXKPzADLmst4O_MsNo-FVIZq-TEzB4Eg';

try {
  // Decode without verification to see the payload
  const decoded = jwt.decode(token, { complete: true });
  console.log('JWT Header:', JSON.stringify(decoded.header, null, 2));
  console.log('JWT Payload:', JSON.stringify(decoded.payload, null, 2));
  
  // Convert timestamps to readable dates
  if (decoded.payload.iat) {
    console.log('Issued At:', new Date(decoded.payload.iat * 1000).toISOString());
  }
  if (decoded.payload.exp) {
    console.log('Expires At:', new Date(decoded.payload.exp * 1000).toISOString());
  }
  if (decoded.payload.nbf) {
    console.log('Not Before:', new Date(decoded.payload.nbf * 1000).toISOString());
  }
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (decoded.payload.exp && decoded.payload.exp < now) {
    console.log('\n⚠️  TOKEN IS EXPIRED!');
  } else {
    console.log('\n✅ Token is still valid');
  }
  
} catch (error) {
  console.error('Error decoding JWT:', error.message);
}