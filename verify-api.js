// Complete API Test - Simulates Next.js API Route
const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const GROQ_API_KEY = env.GROQ_API_KEY;
const GEMINI_API_KEY = env.GEMINI_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

console.log('\n===========================================');
console.log('🧪 NEUROGEN SUITE - COMPLETE API TEST');
console.log('===========================================\n');

console.log('📋 Configuration Check:');
console.log('  GROQ_API_KEY:', GROQ_API_KEY ? '✅ Found' : '❌ Missing');
console.log('  GEMINI_API_KEY:', GEMINI_API_KEY ? '✅ Found' : '❌ Missing');
console.log('  Model:', GROQ_MODEL);
console.log('');

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found in .env.local!');
  process.exit(1);
}

// Test 1: Level Generation (like the generative level engine)
console.log('🎮 Test 1: Level Generation API...');
testLevelGeneration();

function testLevelGeneration() {
  const payload = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a creative game designer. Generate engaging themes for educational games.'
      },
      {
        role: 'user',
        content: 'Generate a maze theme for a 7 year old who likes space. Return only JSON with fields: theme, story, character, goal.'
      }
    ],
    temperature: 0.8,
    max_tokens: 300
  });

  const options = {
    hostname: 'api.groq.com',
    port: 443,
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        const content = response.choices?.[0]?.message?.content || '';
        console.log('  Status: ✅ SUCCESS');
        console.log('  Response:', content.substring(0, 100) + '...');
        console.log('');
        
        // Test 2: Report Generation
        setTimeout(() => {
          console.log('📊 Test 2: Report Generation API...');
          testReportGeneration();
        }, 1000);
      } else {
        console.error('  Status: ❌ FAILED -', res.statusCode);
        console.error('  Error:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('  Network Error:', error.message);
  });

  req.write(payload);
  req.end();
}

function testReportGeneration() {
  const prompt = `Analyze the following gaming biometrics for a 7-year-old child:

MAZE GAME (Dysgraphia Assessment):
- Mean Squared Error: 42 (age-appropriate threshold: 45)
- Jerk Analysis: 8.2 (age-appropriate threshold: 10)
- Wall Collisions: 3

PHONIC FINDER (Dyslexia Assessment):
- Phonemic Processing Delay: 850ms (age-appropriate threshold: 1200ms)
- Phonological Errors: 2

Generate a clinical report focusing on their performance. Format as JSON with: summary, findings (array), recommendations (array), confidence (low/medium/high).`;

  const payload = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert pediatric neuropsychologist. Analyze biometric data and provide evidence-based assessments.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const options = {
    hostname: 'api.groq.com',
    port: 443,
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        const content = response.choices?.[0]?.message?.content || '';
        console.log('  Status: ✅ SUCCESS');
        console.log('  Response length:', content.length, 'characters');
        console.log('  Preview:', content.substring(0, 150) + '...');
        console.log('');
        console.log('===========================================');
        console.log('✅ ALL TESTS PASSED!');
        console.log('===========================================');
        console.log('');
        console.log('🎉 Your Groq API is working perfectly!');
        console.log('📝 Next.js will use Groq as primary AI service.');
        console.log('🔄 Gemini will be used as fallback if Groq fails.');
        console.log('');
      } else {
        console.error('  Status: ❌ FAILED -', res.statusCode);
        console.error('  Error:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('  Network Error:', error.message);
  });

  req.write(payload);
  req.end();
}
