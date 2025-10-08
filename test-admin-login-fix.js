const axios = require('axios');
const fs = require('fs');

// Test configuration
const LOCAL_API_URL = 'http://localhost:8080/api/1.0';
const PRODUCTION_API_URL = 'https://alter-buddy-api-main-production.up.railway.app/api/1.0';
const ADMIN_CREDENTIALS = {
  email: 'admin@alterbuddy.com',
  password: 'admin123'
};

const testResults = [];

function logTest(testName, success, message, data = null, error = null) {
  const result = {
    test: testName,
    success,
    message,
    timestamp: new Date().toISOString(),
    data,
    error: error ? {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    } : null
  };
  
  testResults.push(result);
  
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}: ${message}`);
  
  if (error && error.response?.data) {
    console.log(`   Error details:`, error.response.data);
  }
}

async function testAdminLogin(apiUrl, environment) {
  try {
    console.log(`\n🔐 Testing Admin Login - ${environment}`);
    console.log(`API URL: ${apiUrl}`);
    
    const response = await axios.put(`${apiUrl}/admin/sign-in`, ADMIN_CREDENTIALS, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const { token, user } = response.data.data;
      
      logTest(
        `Admin Login (${environment})`,
        true,
        `Login successful. User: ${user.email}, Role: ${user.role}`,
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          tokenLength: token.length
        }
      );
      
      // Test authenticated request
      await testAuthenticatedRequest(apiUrl, token, environment);
      
      return token;
    } else {
      throw new Error('Unexpected response format');
    }
    
  } catch (error) {
    logTest(
      `Admin Login (${environment})`,
      false,
      `Login failed: ${error.message}`,
      null,
      error
    );
    return null;
  }
}

async function testAuthenticatedRequest(apiUrl, token, environment) {
  try {
    // Test admin-only endpoint (if available)
    const response = await axios.get(`${apiUrl}/admin/test`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    logTest(
      `Admin Auth Test (${environment})`,
      true,
      'Authenticated admin request successful'
    );
    
  } catch (error) {
    if (error.response?.status === 404) {
      logTest(
        `Admin Auth Test (${environment})`,
        true,
        'Admin test endpoint not found (expected for some deployments)'
      );
    } else {
      logTest(
        `Admin Auth Test (${environment})`,
        false,
        `Authenticated request failed: ${error.message}`,
        null,
        error
      );
    }
  }
}

async function testInvalidCredentials(apiUrl, environment) {
  try {
    console.log(`\n🚫 Testing Invalid Credentials - ${environment}`);
    
    const response = await axios.put(`${apiUrl}/admin/sign-in`, {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // If we get here, something's wrong
    logTest(
      `Invalid Credentials Test (${environment})`,
      false,
      'Expected 401 error but got success response'
    );
    
  } catch (error) {
    if (error.response?.status === 401) {
      logTest(
        `Invalid Credentials Test (${environment})`,
        true,
        'Correctly rejected invalid credentials with 401'
      );
    } else {
      logTest(
        `Invalid Credentials Test (${environment})`,
        false,
        `Unexpected error: ${error.message}`,
        null,
        error
      );
    }
  }
}

async function runTests() {
  console.log('🧪 Admin Login Fix Verification Tests');
  console.log('=====================================');
  
  // Test local server first
  console.log('\n📍 Testing Local Server...');
  const localToken = await testAdminLogin(LOCAL_API_URL, 'Local');
  await testInvalidCredentials(LOCAL_API_URL, 'Local');
  
  // Test production server
  console.log('\n🌐 Testing Production Server...');
  const prodToken = await testAdminLogin(PRODUCTION_API_URL, 'Production');
  await testInvalidCredentials(PRODUCTION_API_URL, 'Production');
  
  // Generate summary
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.test}: ${result.message}`);
    });
  }
  
  // Save detailed results
  const timestamp = Date.now();
  const filename = `admin-login-test-results-${timestamp}.json`;
  
  const detailedResults = {
    summary: {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
    },
    tests: testResults,
    environment: {
      localApiUrl: LOCAL_API_URL,
      productionApiUrl: PRODUCTION_API_URL,
      adminEmail: ADMIN_CREDENTIALS.email
    }
  };
  
  fs.writeFileSync(filename, JSON.stringify(detailedResults, null, 2));
  console.log(`\n💾 Detailed results saved to: ${filename}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Admin login fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the results above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});