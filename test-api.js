// Test script for Groq API
const testAPI = async () => {
  console.log('Testing Groq API...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'level-generation',
        prompt: 'Generate a maze theme for a 7 year old who likes dinosaurs. Return JSON with: theme, story, character, goal.'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Source:', data.source || 'unknown');
    console.log('\nResponse:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.source?.includes('groq')) {
      console.log('\n✅ SUCCESS: Groq API (Llama 3.3 70B) is working!');
    } else if (data.source?.includes('gemini')) {
      console.log('\n⚠️ Using Gemini fallback - check Groq API key');
    } else if (data.content) {
      console.log('\n✅ API returned content');
    } else {
      console.log('\n❌ No content returned');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testAPI();
