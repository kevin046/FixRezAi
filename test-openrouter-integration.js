// Test script to verify OpenRouter API integration
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SYSTEM_PROMPT = `You are a resume optimization expert. Read the resume and job description, then return a JSON-optimized resume that includes relevant keywords from the job description.

Rules:
1. Return ONLY valid JSON
2. Keep it to one page
3. Use keywords from the job description
4. Be concise and professional
5. Use Canadian spelling

JSON format:
{
  "header": {"name": "Name", "contact": "City, Province • email • phone"},
  "summary": "2-3 sentence summary with job keywords",
  "experience": [{"company": "Name", "location": "City, Province", "dates": "MMM YYYY - MMM YYYY", "title": "Title", "bullets": ["achievement with keywords"]}],
  "education": [{"school": "Name", "location": "City, Province", "dates": "Year - Year", "degree": "Degree"}],
  "additional": {"technical_skills": "skills", "languages": "languages", "certifications": "certs"}
}`;

async function testOpenRouterAPI() {
  console.log('🧪 Testing OpenRouter API integration...');
  console.log('🔑 API Key present:', !!OPENROUTER_API_KEY);
  
  if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable');
    return;
  }

  const testPrompt = `Resume:
John Doe
Software Developer with 5 years experience
Toronto, ON • john@email.com • 555-123-4567

Experience:
Senior Developer at TechCorp (2020-2024)
- Built scalable web applications using React and Node.js
- Led team of 3 developers on major project

Education:
University of Toronto, B.Sc Computer Science (2016-2020)

Job Description:
We are looking for a Senior Software Developer with experience in React, Node.js, and team leadership. Must have strong communication skills and experience with scalable web applications.

Please optimize this resume for the job description.`;

  const body = {
    model: 'meta-llama/llama-4-maverick:free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: testPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1000
  };

  try {
    console.log('📡 Making API call to OpenRouter...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'FixRez Test'
      },
      body: JSON.stringify(body)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('📄 Raw response:', text.substring(0, 500) + '...');

    if (!response.ok) {
      console.error('❌ API call failed:', response.status, text);
      return;
    }

    const data = JSON.parse(text);
    console.log('✅ API call successful!');
    console.log('📝 Response data:', JSON.stringify(data, null, 2));

    // Extract and validate JSON from response
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log('📝 Generated content length:', content.length);
      
      // Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedJson = JSON.parse(jsonMatch[0]);
          console.log('✅ Valid JSON extracted from response');
          console.log('📋 Parsed JSON preview:', JSON.stringify(parsedJson, null, 2).substring(0, 300) + '...');
        } catch (parseError) {
          console.warn('⚠️ Could not parse extracted JSON:', parseError.message);
        }
      } else {
        console.warn('⚠️ No JSON found in response content');
      }
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('📍 Error stack:', error.stack);
  }
}

// Run the test
testOpenRouterAPI().catch(console.error);