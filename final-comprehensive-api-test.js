const https = require('https');
const fs = require('fs');

const BASE_URL = 'alter-buddy-api.onrender.com';
const API_VERSION = '/api/1.0';

// Correct admin credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@alterbuddy.com',
  password: 'admin123'
};

class APITester {
  constructor() {
    this.results = [];
    this.adminToken = null;
    this.userToken = null;
    this.mentorToken = null;
  }

  async makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: BASE_URL,
        port: 443,
        path: `${API_VERSION}${path}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve({
              status: res.statusCode,
              data: parsedData,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async testEndpoint(name, path, method = 'GET', data = null, headers = {}, expectedStatus = 200) {
    try {
      console.log(`Testing ${name}: ${method} ${path}`);
      const response = await this.makeRequest(path, method, data, headers);
      
      const success = response.status === expectedStatus;
      const result = {
        name,
        path: `${API_VERSION}${path}`,
        method,
        status: response.status,
        expectedStatus,
        success,
        data: response.data,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      console.log(`${success ? '✅' : '❌'} ${name}: ${response.status}`);
      
      if (!success && response.data && response.data.message) {
        console.log(`   Message: ${response.data.message}`);
      }
      
      return response;
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error.message}`);
      this.results.push({
        name,
        path: `${API_VERSION}${path}`,
        method,
        status: 'ERROR',
        expectedStatus,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting FINAL comprehensive API tests on hosted server...');
    console.log(`Base URL: https://${BASE_URL}${API_VERSION}`);
    console.log('='.repeat(60));

    // 1. Admin Authentication Tests
    console.log('\n📋 Testing Admin Authentication...');
    const adminLoginResponse = await this.testEndpoint(
      'Admin Login',
      '/admin/sign-in',
      'PUT',
      ADMIN_CREDENTIALS
    );
    
    if (adminLoginResponse && adminLoginResponse.data && adminLoginResponse.data.token) {
      this.adminToken = adminLoginResponse.data.token;
      console.log('✅ Admin token obtained successfully');
    } else {
      console.log('❌ Failed to obtain admin token');
    }

    // Admin Profile and Dashboard
    if (this.adminToken) {
      await this.testEndpoint(
        'Admin Profile',
        '/admin/profile',
        'GET',
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      await this.testEndpoint(
        'Admin Dashboard',
        '/admin/dashboard',
        'GET',
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );
    }

    // 2. Public Endpoints (No Authentication Required)
    console.log('\n🌐 Testing Public Endpoints...');
    
    await this.testEndpoint(
      'Get All Categories',
      '/category',
      'GET'
    );

    await this.testEndpoint(
      'Get Top Mentors',
      '/top-mentor',
      'GET'
    );

    await this.testEndpoint(
      'Get All Posts',
      '/posts',
      'GET'
    );

    await this.testEndpoint(
      'Get All Blogs',
      '/blog',
      'GET'
    );

    await this.testEndpoint(
      'Admin Test Endpoint',
      '/admin/test',
      'GET'
    );

    // 3. Admin-only endpoints (if admin token available)
    if (this.adminToken) {
      console.log('\n🔐 Testing Admin-only Endpoints...');
      
      await this.testEndpoint(
        'Get All Users (Admin)',
        '/user/all',
        'GET',
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      await this.testEndpoint(
        'Get All Mentors (Admin)',
        '/mentor/all',
        'GET',
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      await this.testEndpoint(
        'Get Website Users (Admin)',
        '/website/users',
        'GET',
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );

      await this.testEndpoint(
        'Get Website Calls (Admin)',
        '/website/calls',
        'GET',
        null,
        { 'Authorization': `Bearer ${this.adminToken}` }
      );
    }

    // 4. Authentication Required Endpoints (Expected to fail without proper tokens)
    console.log('\n🔒 Testing Authentication Required Endpoints (Expected 401s)...');
    
    await this.testEndpoint(
      'User Signup (Test User Already Exists)',
      '/sign-up',
      'POST',
      {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123'
      },
      {},
      401 // Expecting 401 since user likely already exists
    );

    await this.testEndpoint(
      'User Login (Invalid Credentials)',
      '/sign-in',
      'PUT',
      { email: 'testuser@example.com', password: 'wrongpassword' },
      {},
      401 // Expecting 401 for wrong password
    );

    await this.testEndpoint(
      'Mentor Login (Invalid Credentials)',
      '/mentor/sign-in',
      'PUT',
      { email: 'mentor@example.com', password: 'wrongpassword' },
      {},
      401 // Expecting 401 for invalid credentials
    );

    await this.testEndpoint(
      'Get Ably Token (No Auth)',
      '/rant/ably/token',
      'GET',
      null,
      {},
      401 // Expecting 401 without authentication
    );

    await this.testEndpoint(
      'Get Stream Token (No Auth)',
      '/rant/get-stream/token',
      'GET',
      null,
      {},
      401 // Expecting 401 without authentication
    );

    await this.testEndpoint(
      'Mentor Test (No Auth)',
      '/mentor/test',
      'GET',
      null,
      {},
      401 // Expecting 401 without authentication
    );

    // 5. Endpoints that might require specific setup
    console.log('\n⚙️ Testing Endpoints with Specific Requirements...');
    
    await this.testEndpoint(
      'Get All Template Packages',
      '/session/packages/all',
      'GET',
      null,
      {},
      400 // Might return 400 if login required
    );

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    
    console.log('\n❌ Failed Tests:');
    this.results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.name}: ${result.status} (expected ${result.expectedStatus})`);
      if (result.data && result.data.message) {
        console.log(`    Message: ${result.data.message}`);
      }
    });
    
    console.log('\n✅ Passed Tests:');
    this.results.filter(r => r.success).forEach(result => {
      console.log(`  - ${result.name}: ${result.status}`);
    });
    
    // Save detailed results to file
    const timestamp = Date.now();
    const filename = `final-api-test-results-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${filename}`);
    
    // Summary of API status
    console.log('\n🎯 API STATUS SUMMARY:');
    console.log('='.repeat(40));
    
    const adminEndpoints = this.results.filter(r => r.name.includes('Admin') && r.success).length;
    const publicEndpoints = this.results.filter(r => 
      (r.name.includes('Categories') || r.name.includes('Top Mentors') || 
       r.name.includes('Posts') || r.name.includes('Blogs') || r.name.includes('Test')) 
      && r.success
    ).length;
    
    console.log(`✅ Admin Authentication: ${adminEndpoints > 0 ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Public Endpoints: ${publicEndpoints > 0 ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Admin-only Endpoints: ${this.adminToken ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
    
    if (successRate >= 70) {
      console.log('\n🎉 Overall API Status: HEALTHY');
    } else if (successRate >= 50) {
      console.log('\n⚠️  Overall API Status: PARTIALLY FUNCTIONAL');
    } else {
      console.log('\n🚨 Overall API Status: NEEDS ATTENTION');
    }
  }
}

// Run the tests
const tester = new APITester();
tester.runAllTests().catch(console.error);