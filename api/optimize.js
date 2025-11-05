import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load local env when running locally; Vercel will inject env in production
dotenv.config({ path: '.env.local' });

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { resumeText, jobDescription } = req.body || {};

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ success: false, error: 'Missing resume or job description' });
    }

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      timeout: 60000,
      maxRetries: 0,
    });

    const prompt = `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const resumeData = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: resumeData });
  } catch (error) {
    console.error('Optimization error:', error?.message || error);
    return res.status(500).json({ 
      success: false,
      error: 'Optimization failed',
      details: error?.message || 'Unknown error'
    });
  }
}
