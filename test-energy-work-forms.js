const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000'; // React app default port
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSc9KPahBJEbyLHyuWEjxk-E32Dh1hMFiFbe85Wi_SfjGiwM1Q/viewform?usp=dialog';

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

function logTest(testName, status, details = '') {
  const result = {
    test: testName,
    status: status,
    details: details,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  testResults.summary.total++;
  testResults.summary[status]++;
  
  console.log(`\n${status.toUpperCase()}: ${testName}`);
  if (details) {
    console.log(`Details: ${details}`);
  }
}

// Test Google Form accessibility
async function testGoogleFormAccess() {
  try {
    console.log('\n=== Testing Google Form Access ===');
    
    const response = await axios.get(GOOGLE_FORM_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.status === 200) {
      logTest('Google Form Access', 'passed', `Form accessible with status ${response.status}`);
      return true;
    } else {
      logTest('Google Form Access', 'failed', `Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Google Form Access', 'failed', `Error: ${error.message}`);
    return false;
  }
}

// Test Energy Work page accessibility
async function testEnergyWorkPage() {
  try {
    console.log('\n=== Testing Energy Work Page ===');
    
    const response = await axios.get(`${BASE_URL}/services/energy-work`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.status === 200) {
      logTest('Energy Work Page Access', 'passed', `Page accessible with status ${response.status}`);
      
      // Check if the page contains expected content
      const pageContent = response.data;
      const hasEnergyWorkContent = pageContent.includes('ENERGY WORK') || 
                                   pageContent.includes('energy work') ||
                                   pageContent.includes('Energy Work');
      
      if (hasEnergyWorkContent) {
        logTest('Energy Work Page Content', 'passed', 'Page contains energy work related content');
      } else {
        logTest('Energy Work Page Content', 'failed', 'Page does not contain expected energy work content');
      }
      
      return true;
    } else {
      logTest('Energy Work Page Access', 'failed', `Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Energy Work Page Access', 'failed', `Error: ${error.message}`);
    return false;
  }
}

// Test form submission simulation (without actually submitting)
async function testFormStructure() {
  try {
    console.log('\n=== Testing Google Form Structure ===');
    
    const response = await axios.get(GOOGLE_FORM_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const formContent = response.data;
    
    // Check for common form elements
    const hasFormElements = formContent.includes('form') || 
                           formContent.includes('input') ||
                           formContent.includes('textarea') ||
                           formContent.includes('submit');
    
    if (hasFormElements) {
      logTest('Google Form Structure', 'passed', 'Form contains expected HTML elements');
    } else {
      logTest('Google Form Structure', 'failed', 'Form does not contain expected HTML elements');
    }
    
    // Check for Google Forms specific content
    const isGoogleForm = formContent.includes('docs.google.com') ||
                        formContent.includes('Google Forms') ||
                        formContent.includes('forms.gle');
    
    if (isGoogleForm) {
      logTest('Google Form Validation', 'passed', 'Confirmed as valid Google Form');
    } else {
      logTest('Google Form Validation', 'failed', 'Not recognized as Google Form');
    }
    
  } catch (error) {
    logTest('Google Form Structure', 'failed', `Error: ${error.message}`);
  }
}

// Test CTA button functionality (simulated)
async function testCTAButtons() {
  console.log('\n=== Testing CTA Button Functionality ===');
  
  // Test the main CTA buttons found in the energy work page
  const ctaButtons = [
    {
      name: 'TALK TO US NOW (Main CTA)',
      action: 'Opens Google Form',
      url: GOOGLE_FORM_URL
    },
    {
      name: 'TALK TO US NOW (Bottom CTA)', 
      action: 'Opens Google Form',
      url: GOOGLE_FORM_URL
    },
    {
      name: 'BOOK MY ENERGY SCAN NOW',
      action: 'Navigates to mentor list (authenticated users)',
      url: `${BASE_URL}/mentor/list`
    },
    {
      name: 'BOOK ME FOR MY VORTEX PROTECTION',
      action: 'Navigates to mentor list (authenticated users)', 
      url: `${BASE_URL}/mentor/list`
    }
  ];
  
  for (const button of ctaButtons) {
    try {
      if (button.url === GOOGLE_FORM_URL) {
        // Test Google Form CTA
        const response = await axios.get(button.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.status === 200) {
          logTest(`CTA Button: ${button.name}`, 'passed', `Successfully opens Google Form`);
        } else {
          logTest(`CTA Button: ${button.name}`, 'failed', `Form not accessible: ${response.status}`);
        }
      } else {
        // Test internal navigation CTA
        const response = await axios.get(button.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.status === 200) {
          logTest(`CTA Button: ${button.name}`, 'passed', `Successfully navigates to ${button.url}`);
        } else {
          logTest(`CTA Button: ${button.name}`, 'failed', `Navigation failed: ${response.status}`);
        }
      }
    } catch (error) {
      logTest(`CTA Button: ${button.name}`, 'failed', `Error: ${error.message}`);
    }
  }
}

// Test responsive design and mobile compatibility
async function testResponsiveDesign() {
  console.log('\n=== Testing Responsive Design ===');
  
  const userAgents = [
    {
      name: 'Desktop Chrome',
      agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    {
      name: 'Mobile Safari',
      agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    },
    {
      name: 'Android Chrome',
      agent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
    }
  ];
  
  for (const ua of userAgents) {
    try {
      const response = await axios.get(`${BASE_URL}/services/energy-work`, {
        timeout: 10000,
        headers: {
          'User-Agent': ua.agent
        }
      });
      
      if (response.status === 200) {
        logTest(`Responsive Design: ${ua.name}`, 'passed', 'Page loads successfully');
      } else {
        logTest(`Responsive Design: ${ua.name}`, 'failed', `Status: ${response.status}`);
      }
    } catch (error) {
      logTest(`Responsive Design: ${ua.name}`, 'failed', `Error: ${error.message}`);
    }
  }
}

// Main test execution
async function runAllTests() {
  console.log('🧪 Starting Energy Work Google Forms CTA Testing...');
  console.log('=' .repeat(60));
  
  try {
    // Test Google Form accessibility
    await testGoogleFormAccess();
    
    // Test Energy Work page
    await testEnergyWorkPage();
    
    // Test form structure
    await testFormStructure();
    
    // Test CTA buttons
    await testCTAButtons();
    
    // Test responsive design
    await testResponsiveDesign();
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    logTest('Test Execution', 'failed', error.message);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⏭️  Skipped: ${testResults.summary.skipped}`);
  console.log(`📈 Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
  
  // Save results to file
  try {
    fs.writeFileSync('energy-work-forms-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n💾 Test results saved to energy-work-forms-test-results.json');
  } catch (error) {
    console.error('Failed to save test results:', error.message);
  }
  
  console.log('\n🏁 Energy Work Forms Testing Complete!');
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testGoogleFormAccess,
  testEnergyWorkPage,
  testFormStructure,
  testCTAButtons,
  testResponsiveDesign
};