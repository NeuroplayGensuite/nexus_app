import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiPrompt, parseGeminiResponse, generateFallbackReport } from '@/lib/gemini/report-generator';
import { BiometricMetrics } from '@/types';

// API Keys - Multiple providers for reliability
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Log API configuration on startup
console.log('🔧 API Configuration:');
console.log('  GROQ_API_KEY:', GROQ_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('  CEREBRAS_API_KEY:', CEREBRAS_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('  TOGETHER_API_KEY:', TOGETHER_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('  GEMINI_API_KEY:', GEMINI_API_KEY ? '✅ Configured' : '❌ Missing');

// API Endpoints
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const CEREBRAS_MODEL = 'llama3.1-70b';
const TOGETHER_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

// Helper function to call Cerebras AI (FREE UNLIMITED - Now Primary!)
async function callCerebrasAPI(prompt: string, temperature = 0.7) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(CEREBRAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: CEREBRAS_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert pediatric neuropsychologist specializing in learning disabilities assessment. Provide detailed, evidence-based analysis with cultural sensitivity for Indian families.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('Cerebras API timeout after 30 seconds');
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Helper function to call Together AI
async function callTogetherAPI(prompt: string, temperature = 0.7) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(TOGETHER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: TOGETHER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert pediatric neuropsychologist specializing in learning disabilities assessment. Provide detailed, evidence-based analysis with cultural sensitivity for Indian families.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('Together API timeout after 30 seconds');
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Helper function to call Groq API
async function callGroqAPI(prompt: string, temperature = 0.7) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert pediatric neuropsychologist specializing in learning disabilities assessment. Provide detailed, evidence-based analysis with cultural sensitivity for Indian families.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: 8192,
        top_p: 0.95,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('Groq API timeout after 30 seconds');
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
}

// Helper function to call Gemini API (Fallback)
async function callGeminiAPI(prompt: string, temperature = 0.7) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: 8192,
          topP: 0.95,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('Gemini API timeout after 30 seconds');
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
}

// Unified AI call with fallback chain: Cerebras -> Together -> Groq -> Gemini
async function callAI(prompt: string, temperature = 0.7): Promise<{ content: string; source: string } | null> {
  // Try Cerebras first (FREE UNLIMITED)
  if (CEREBRAS_API_KEY) {
    try {
      console.log('✅ Using Cerebras AI (Llama 3.1 70B - FREE UNLIMITED)');
      const response = await callCerebrasAPI(prompt, temperature);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cerebras API error:', errorData);
        throw new Error('Cerebras API failed');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        source: 'cerebras'
      };
    } catch (error) {
      console.warn('Cerebras API unavailable, trying Together AI...');
    }
  }

  // Try Together AI second (Free $25/month)
  if (TOGETHER_API_KEY) {
    try {
      console.log('✅ Using Together AI (Llama 3.1 70B)');
      const response = await callTogetherAPI(prompt, temperature);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Together API error:', errorData);
        throw new Error('Together API failed');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        source: 'together'
      };
    } catch (error) {
      console.warn('Together AI unavailable, trying Groq...');
    }
  }

  // Try Groq third (100K tokens/day limit)
  if (GROQ_API_KEY) {
    try {
      console.log('✅ Using Groq API (Llama 3.3 70B)');
      const response = await callGroqAPI(prompt, temperature);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq API error:', errorData);
        throw new Error('Groq API failed');
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        source: 'groq'
      };
    } catch (error) {
      console.warn('Groq API unavailable, trying Gemini...');
    }
  }

  // Try Gemini last (1,500 req/day)
  // Try Groq first (fastest, highest quota)
  if (GROQ_API_KEY) {
    try {
      const response = await callGroqAPI(prompt, temperature);
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (content) {
          console.log('✅ Using Groq API (Llama 3.3 70B)');
          return { content, source: 'groq-llama-3.3-70b' };
        }
      } else {
        console.warn('Groq API error:', await response.text());
      }
    } catch (error) {
      console.warn('Groq API failed:', error);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    try {
      const response = await callGeminiAPI(prompt, temperature);
      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (content) {
          console.log('✅ Using Gemini API (fallback)');
          return { content, source: 'gemini-2.0-flash' };
        }
      } else {
        console.warn('Gemini API error:', await response.text());
      }
    } catch (error) {
      console.warn('Gemini API failed:', error);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a level generation request
    if (body.type === 'level-generation') {
      return handleLevelGeneration(body.prompt);
    }

    // Otherwise, handle report generation
    return handleReportGeneration(body);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Handle level generation for Generative Level Engine
async function handleLevelGeneration(prompt: string) {
  if (!prompt) {
    return NextResponse.json(
      { error: 'Missing prompt for level generation' },
      { status: 400 }
    );
  }

  // Use unified AI with fallback
  const result = await callAI(prompt, 0.8); // Higher creativity for games

  if (!result) {
    console.error('All AI APIs failed for level generation');
    return NextResponse.json({ content: null, error: 'All AI APIs unavailable' });
  }

  return NextResponse.json({ content: result.content, source: result.source });
}

// Handle report generation
async function handleReportGeneration(body: {
  metrics: BiometricMetrics;
  childAge: number;
  language?: 'en' | 'ml' | 'hi';
}) {
  const { metrics, childAge, language = 'en' } = body;

  // Validate input
  if (!metrics || typeof childAge !== 'number') {
    return NextResponse.json(
      { error: 'Missing required fields: metrics and childAge' },
      { status: 400 }
    );
  }

  // If no API keys configured, use fallback report
  if (!GROQ_API_KEY && !GEMINI_API_KEY) {
    console.warn('No AI API keys configured, using fallback report');
    const fallbackReport = generateFallbackReport(metrics, childAge);
    return NextResponse.json({
      report: fallbackReport,
      source: 'fallback',
      message: 'Report generated using fallback system (No AI API configured)'
    });
  }

  // Generate prompt with Hybrid AI (ML + Dataset analysis)
  const prompt = await generateGeminiPrompt(metrics, childAge, language);

  // Use unified AI with fallback chain
  const result = await callAI(prompt, 0.7);

  if (!result) {
    // All APIs failed, use fallback
    console.error('All AI APIs failed, using fallback report');
    const fallbackReport = generateFallbackReport(metrics, childAge);
    return NextResponse.json({
      report: fallbackReport,
      source: 'fallback',
      error: 'All AI APIs unavailable, using fallback report'
    });
  }

  // Parse the response
  const parsedReport = parseGeminiResponse(result.content);

  if (!parsedReport) {
    // If parsing fails, use fallback
    const fallbackReport = generateFallbackReport(metrics, childAge);
    return NextResponse.json({
      report: fallbackReport,
      source: 'fallback',
      rawResponse: result.content,
      error: 'Failed to parse AI response'
    });
  }

  return NextResponse.json({
    report: parsedReport,
    source: result.source,
    rawResponse: result.content
  });
}
