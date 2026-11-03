import http from 'http';
import { app } from './app.js';
import { connectDatabase, prisma } from './config/database.js';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 Starting CertiTrust Backend Automated Test Suite');
  console.log('==================================================');

  await connectDatabase();

  const server = http.createServer(app);
  const port = 5001; // Test port to avoid conflicts
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Test server running at http://localhost:${port}`);

  let passed = 0;
  let failed = 0;

  async function request(path, options = {}) {
    const url = `http://localhost:${port}${path}`;
    const method = options.method || 'GET';
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const body = options.body ? JSON.stringify(options.body) : undefined;

    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = { raw: text };
    }
    return { status: res.status, data: json };
  }

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('\n--- 1. Health Check ---');
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'GET /health returns healthy');

    // 2. Auth Login (Student: Alex Chen)
    console.log('\n--- 2. Auth Login ---');
    const loginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'alex.chen@student.edu', password: 'Password123!' },
    });
    assert(loginRes.status === 200 && loginRes.data.success, 'POST /api/v1/auth/login succeeds for Alex Chen');
    const token = loginRes.data.data?.accessToken;
    assert(Boolean(token), 'Access token received');

    // 3. Auth Me
    console.log('\n--- 3. Auth Profile (Me) ---');
    const meRes = await request('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(meRes.status === 200 && meRes.data.data.email === 'alex.chen@student.edu', 'GET /api/v1/auth/me returns Alex Chen');

    // 4. Student Dashboard
    console.log('\n--- 4. Student Dashboard ---');
    const dashRes = await request('/api/v1/students/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(dashRes.status === 200 && dashRes.data.data.totalCredentials > 0, 'GET /api/v1/students/dashboard returns metrics');

    // 5. Student Skills
    console.log('\n--- 5. Student Skills ---');
    const skillsRes = await request('/api/v1/students/skills', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(skillsRes.status === 200 && Array.isArray(skillsRes.data.data), 'GET /api/v1/students/skills returns skill records');

    // 6. Student Credentials
    console.log('\n--- 6. Student Credentials ---');
    const credsRes = await request('/api/v1/credentials/my', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(credsRes.status === 200 && credsRes.data.data.length > 0, 'GET /api/v1/credentials/my returns credentials');

    // 7. 6-Point Verification (Valid Credential)
    console.log('\n--- 7. 6-Point Cryptographic Verification (Active Credential) ---');
    const verifyValid = await request('/api/v1/verification/verify/OXF-2025-CS-00491');
    assert(verifyValid.status === 200, 'GET /api/v1/verification/verify/... status is 200');
    assert(verifyValid.data.data.overallStatus === 'VALID', 'Overall status is VALID');
    assert(verifyValid.data.data.verificationScore === 100, 'Verification score is 100%');
    assert(verifyValid.data.data.checks.signatureValid === true, 'Check: signatureValid is true');
    assert(verifyValid.data.data.checks.notRevoked === true, 'Check: notRevoked is true');
    assert(verifyValid.data.data.checks.blockchainRecorded === true, 'Check: blockchainRecorded is true');

    // 8. 6-Point Verification (Revoked Credential)
    console.log('\n--- 8. 6-Point Verification (Revoked Credential) ---');
    const verifyRevoked = await request('/api/v1/verification/verify/OXF-2024-LEGACY-0012');
    assert(verifyRevoked.status === 200, 'GET verification for revoked credential returns 200');
    assert(verifyRevoked.data.data.overallStatus === 'REVOKED', 'Overall status is correctly REVOKED');
    assert(verifyRevoked.data.data.checks.notRevoked === false, 'Check: notRevoked is false');

    // 9. Groq AI Skill Extraction
    console.log('\n--- 9. Groq AI Skill Extraction ---');
    const aiExtract = await request('/api/v1/ai/extract-skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        text: 'Engineered ERC-20 staking contract in Solidity, wrote unit tests with Hardhat, and built frontends using React and Ethers.js.',
      },
    });
    assert(aiExtract.status === 200 && aiExtract.data.success, 'POST /api/v1/ai/extract-skills returns success');
    assert(Array.isArray(aiExtract.data.data?.skills), 'AI extracted skills array is returned');
    console.log(`  AI Extracted: ${aiExtract.data.data?.skills?.map((s) => s.name).join(', ')}`);

    // 10. Groq AI Assistant Chat
    console.log('\n--- 10. Groq AI Career Advisor Chat ---');
    const aiChat = await request('/api/v1/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        messages: [{ role: 'user', content: 'What are the top 2 skills needed for blockchain auditing?' }],
      },
    });
    assert(aiChat.status === 200 && aiChat.data.data?.content?.length > 10, 'POST /api/v1/ai/chat returns assistant response');
    console.log(`  Advisor response preview: ${aiChat.data.data?.content?.slice(0, 100)}...`);

    // 11. Public Student Portfolio
    console.log('\n--- 11. Public Student Portfolio ---');
    const portfolioRes = await request('/api/v1/students/portfolio/alex-chen');
    assert(portfolioRes.status === 200 && portfolioRes.data.data?.name === 'Alex Chen', 'GET /api/v1/students/portfolio/alex-chen returns portfolio');

    console.log('\n==================================================');
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log('==================================================');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
