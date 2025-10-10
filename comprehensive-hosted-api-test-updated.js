const https = require('https');
const fs = require('fs');

const BASE_URL = 'alter-buddy-api.onrender.com';
const API_VERSION = '/api/1.0';

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
    console.log('🚀 Starting comprehensive API tests on hosted server...');
    console.log(`Base URL: https://${BASE_URL}${API_VERSION}`);
    console.log('=' * 60);

    // 1. Admin Authentication Tests
    console.log('\n📋 Testing Admin Authentication...');
    const adminLoginResponse = await this.testEndpoint(
      'Admin Login',
      '/admin/sign-in',
      'PUT',
      { email: 'admin@admin.com', password: 'admin123' }
    );
    
    if (adminLoginResponse && adminLoginResponse.data && adminLoginResponse.data.token) {
      this.adminToken = adminLoginResponse.data.token;
      console.log('✅ Admin token obtained');
    }

    // Admin Profile
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

    // 2. User Authentication Tests
    console.log('\n👤 Testing User Authentication...');
    await this.testEndpoint(
      'User Signup',
      '/sign-up',
      'POST',
      {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123'
      }
    );

    await this.testEndpoint(
      'User Login',
      '/sign-in',
      'PUT',
      { email: 'testuser@example.com', password: 'password123' }
    );

    // 3. Mentor Authentication Tests
    console.log('\n🎓 Testing Mentor Authentication...');
    await this.testEndpoint(
      'Mentor Login',
      '/mentor/sign-in',
      'PUT',
      { email: 'mentor@example.com', password: 'password123' }
    );

    // 4. Category Tests
    console.log('\n📂 Testing Category Endpoints...');
    await this.testEndpoint(
      'Get All Categories',
      '/category',
      'GET'
    );

    // 5. Features Tests
    console.log('\n⭐ Testing Features Endpoints...');
    await this.testEndpoint(
      'Get Top Mentors',
      '/top-mentor',
      'GET'
    );

    // 6. Posts Tests
    console.log('\n📝 Testing Posts Endpoints...');
    await this.testEndpoint(
      'Get All Posts',
      '/posts',
      'GET'
    );

    // 7. Rant Tests
    console.log('\n💬 Testing Rant Endpoints...');
    await this.testEndpoint(
      'Get Ably Token',
      '/rant/ably/token',
      'GET'
    );

    await this.testEndpoint(
      'Get Stream Token',
      '/rant/get-stream/token',
      'GET'
    );

    // 8. Session Package Tests
    console.log('\n📦 Testing Session Package Endpoints...');
    await this.testEndpoint(
      'Get All Template Packages',
      '/session/packages/all',
      'GET'
    );

    // 9. Blog Tests
    console.log('\n📰 Testing Blog Endpoints...');
    await this.testEndpoint(
      'Get All Blogs',
      '/blog',
      'GET'
    );

    // 10. Admin-only endpoints (if admin token available)
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

    // 11. General Tests
    console.log('\n🔧 Testing General Endpoints...');
    await this.testEndpoint(
      'Admin Test',
      '/admin/test',
      'GET'
    );

    await this.testEndpoint(
      'Mentor Test',
      '/mentor/test',
      'GET'
    );

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '=' * 60);
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' * 60);
    
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
    const filename = `hosted-api-test-results-updated-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${filename}`);
  }
}

// Run the tests
const tester = new APITester();
tester.runAllTests().catch(console.error);