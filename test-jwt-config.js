const config = require('config');
const jwt = require('jsonwebtoken');

console.log('Testing JWT configuration...');

try {
  // Test if config is accessible
  console.log('Config available:', !!config);
  
  // Test JWT_SECRET
  const jwtSecret = config.get('JWT_SECRET');
  console.log('JWT_SECRET:', jwtSecret);
  
  // Test JWT_EXPIRE
  const jwtExpire = config.get('JWT_EXPIRE');
  console.log('JWT_EXPIRE:', jwtExpire);
  
  // Test creating a JWT token
  const testToken = jwt.sign(
    { id: 'test123' },
    jwtSecret,
    { expiresIn: jwtExpire }
  );
  
  console.log('Test token created successfully:', !!testToken);
  console.log('Token length:', testToken.length);
  
  // Test verifying the token
  const decoded = jwt.verify(testToken, jwtSecret);
  console.log('Token verification successful:', !!decoded);
  console.log('Decoded payload:', decoded);
  
} catch (error) {
  console.error('Error testing JWT configuration:', error.message);
  console.error('Full error:', error);
}

// Also test environment variables
console.log('\nEnvironment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NODE_CONFIG_ENV:', process.env.NODE_CONFIG_ENV);
console.log('JWT_SECRET env var:', process.env.JWT_SECRET);
console.log('JWT_EXPIRE env var:', process.env.JWT_EXPIRE);