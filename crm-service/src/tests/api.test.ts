import axios from 'axios';
import * as assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting SmartReach API Integration Tests...');
  let token = '';
  let customerId = '';
  let segmentId = '';
  let campaignId = '';
  let communicationId = '';

  const testEmail = `tester-${Date.now()}@test.com`;

  try {
    // 1. Test Auth: Registration
    console.log('\n1. Testing User Registration...');
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'QA Engineer',
      email: testEmail,
      password: 'securepassword123'
    });
    assert.strictEqual(registerRes.status, 214);
    assert.ok(registerRes.data.token);
    assert.strictEqual(registerRes.data.user.email, testEmail);
    console.log('✅ User Registration passed.');

    // 2. Test Auth: Login
    console.log('\n2. Testing User Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: 'securepassword123'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.token);
    token = loginRes.data.token;
    console.log('✅ User Login passed.');

    const headers = { Authorization: `Bearer ${token}` };

    // 3. Test Customer: Create Customer
    console.log('\n3. Testing Manual Customer Creation...');
    const custRes = await axios.post(`${BASE_URL}/customers`, {
      name: 'Agent Smith',
      email: `smith-${Date.now()}@matrix.org`,
      phone: '+15559999',
      city: 'MegaCity',
      age: 40
    }, { headers });
    assert.strictEqual(custRes.status, 214);
    assert.ok(custRes.data.id);
    customerId = custRes.data.id;
    console.log('✅ Customer Creation passed.');

    // 4. Test Customer: Get Customer List
    console.log('\n4. Testing Customer List retrieval...');
    const listRes = await axios.get(`${BASE_URL}/customers`, { headers });
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.data));
    assert.ok(listRes.data.length > 0);
    console.log('✅ Customer List retrieval passed.');

    // 5. Test AI Segments: Natural Language Parse (Heuristic fallback check)
    console.log('\n5. Testing AI Segment Parsing (Natural Language)...');
    const parseRes = await axios.post(`${BASE_URL}/segments/parse`, {
      prompt: 'Customers in MegaCity aged over 30'
    }, { headers });
    assert.strictEqual(parseRes.status, 200);
    assert.ok(parseRes.data.rules);
    assert.strictEqual(parseRes.data.rules.city, 'MegaCity');
    assert.strictEqual(parseRes.data.rules.age?.gt, 30);
    console.log('✅ Segment Query Parsing passed.');

    // 6. Test Segments: Save Segment
    console.log('\n6. Testing Saving Audiences Segment...');
    const segRes = await axios.post(`${BASE_URL}/segments`, {
      name: 'MegaCity Elders',
      description: 'Customers residing in MegaCity above age 30',
      rules: parseRes.data.rules
    }, { headers });
    assert.strictEqual(segRes.status, 214);
    assert.ok(segRes.data.id);
    segmentId = segRes.data.id;
    console.log('✅ Segment Saving passed.');

    // 7. Test Campaign: Create Campaign Draft
    console.log('\n7. Testing Campaign Composition...');
    const campRes = await axios.post(`${BASE_URL}/campaigns`, {
      name: 'Defeat Zion Campaign',
      segmentId,
      channel: 'SMS',
      message: 'Hello [Customer Name], welcome back to MegaCity. Terminate Zion now.'
    }, { headers });
    assert.strictEqual(campRes.status, 214);
    assert.ok(campRes.data.id);
    assert.strictEqual(campRes.data.status, 'DRAFT');
    campaignId = campRes.data.id;
    console.log('✅ Campaign Creation passed.');

    // 8. Test Campaign Dispatch
    console.log('\n8. Testing Campaign Dispatch initiation...');
    const sendRes = await axios.post(`${BASE_URL}/campaigns/${campaignId}/send`, {}, { headers });
    assert.strictEqual(sendRes.status, 200);
    assert.ok(sendRes.data.message);
    console.log('✅ Campaign Send triggered.');

    // Wait a brief moment to let the database record the communication
    await new Promise(r => setTimeout(r, 1000));

    // Fetch campaign detail to extract dynamic communicationId
    const detailRes = await axios.get(`${BASE_URL}/campaigns/${campaignId}`, { headers });
    assert.ok(detailRes.data.communications.length > 0);
    communicationId = detailRes.data.communications[0].id;

    // 9. Test Callback Receipts (Simulation Endpoint)
    console.log('\n9. Testing Simulator Callback receipt processing...');
    const callbackRes = await axios.post(`${BASE_URL}/receipts`, {
      communicationId,
      status: 'CLICKED'
    });
    assert.strictEqual(callbackRes.status, 200);
    assert.strictEqual(callbackRes.data.success, true);
    console.log('✅ Receipt Callback logic passed.');

    // 10. Test Analytics Retrieval
    console.log('\n10. Testing Analytics dashboard aggregates...');
    const analyticsRes = await axios.get(`${BASE_URL}/analytics`, { headers });
    assert.strictEqual(analyticsRes.status, 200);
    assert.ok(analyticsRes.data.overview);
    assert.ok(analyticsRes.data.campaignPerformance);
    assert.ok(analyticsRes.data.conversionGraph);
    console.log('✅ Analytics overview successfully compiled.');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED ENCOUNTERING AN ERROR:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Check if running directly to execute
if (require.main === module) {
  runTests();
}

export { runTests };
