// Standalone Groq API Test
const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY || 'your-api-key-here';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const payload = JSON.stringify({
  model: GROQ_MODEL,
  messages: [
    {
      role: 'system',
      content: 'You are a helpful AI assistant.'
    },
    {
      role: 'user',
      content: 'Say "Groq API is working perfectly!" and nothing else.'
    }
  ],
  temperature: 0.7,
  max_tokens: 50
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

console.log('\n🧪 Testing Groq API...\n');
console.log('Model:', GROQ_MODEL);
console.log('API Key:', GROQ_API_KEY.substring(0, 20) + '...');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nStatus Code:', res.statusCode);
    
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        const content = response.choices?.[0]?.message?.content || '';
        console.log('\n✅ SUCCESS!');
        console.log('Response:', content);
        console.log('\n✅ Groq API is configured correctly and working!');
      } catch (e) {
        console.error('\n❌ Failed to parse response');
        console.error('Raw data:', data);
      }
    } else {
      console.error('\n❌ FAILED!');
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
});

req.write(payload);
req.end();
