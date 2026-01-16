// Test if Next.js can read .env.local
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('\n🔍 Environment Variables Check:\n');
console.log('GROQ_API_KEY:', envVars.GROQ_API_KEY ? '✅ SET (' + envVars.GROQ_API_KEY.substring(0, 20) + '...)' : '❌ NOT SET');
console.log('GEMINI_API_KEY:', envVars.GEMINI_API_KEY ? '✅ SET (' + envVars.GEMINI_API_KEY.substring(0, 20) + '...)' : '❌ NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_URL:', envVars.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('\n');

// Now test Groq API call with the env variable
const https = require('https');

const GROQ_API_KEY = envVars.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found in environment!');
  process.exit(1);
}

const payload = JSON.stringify({
  model: GROQ_MODEL,
  messages: [
    {
      role: 'user',
      content: 'Generate a short report summary (2 sentences) for a child with good motor skills.'
    }
  ],
  temperature: 0.7,
  max_tokens: 100
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

console.log('🧪 Testing Groq API with environment variable...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        const content = response.choices?.[0]?.message?.content || '';
        console.log('\n✅ Groq API Response:');
        console.log(content);
        console.log('\n✅ Everything is working! Your Next.js app should use Groq as primary.');
      } catch (e) {
        console.error('❌ Parse error:', e.message);
      }
    } else {
      console.error('❌ API Error:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.write(payload);
req.end();
