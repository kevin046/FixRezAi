import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load local env when running locally; ensure correct path regardless of cwd
try {
  const cwdEnv = path.resolve(process.cwd(), '.env.local');
  const rootEnv = path.resolve(__dirname, '../.env.local');
  const envPath = fs.existsSync(cwdEnv) ? cwdEnv : rootEnv;
  dotenv.config({ path: envPath });
} catch {}

const SYSTEM_PROMPT = `You are a resume optimization expert. Read the resume and job description, then return a JSON-optimized resume that includes relevant keywords from the job description.

Rules:
1. Return ONLY valid JSON
2. Keep it to one page
3. Use keywords from the job description
4. Be concise and professional
5. Use Canadian spelling
6. PROFESSIONAL EXPERIENCE: Select 2-3 MOST RELEVANT positions from the user's actual resume that align with the target job. Do NOT create fictional experience. Extract actual companies, dates, and achievements from the resume, then optimize the bullet points with job-relevant keywords and quantifiable results.
7. EXPERIENCE CALCULATION: Calculate total years of experience from the ACTUAL employment dates in the resume. Sum up all relevant work experience and reflect this accurately in the professional summary.

JSON format:
{
  "header": {"name": "Name", "contact": "City, Province • email • phone"},
  "summary": "2-3 sentence summary with job keywords",
  "experience": [{"company": "Name", "location": "City, Province", "dates": "MMM YYYY - MMM YYYY", "title": "Title", "bullets": ["achievement with keywords"]}],
  "education": [{"school": "Name", "location": "City, Province", "dates": "Year - Year", "degree": "Degree"}],
  "additional": {"technical_skills": "core competencies and professional skills relevant to the role, focusing on methodologies, analytical skills, and industry expertise rather than specific software tools unless mentioned in job description", "languages": "languages", "certifications": "certs"}
}`;

const envModel = process.env.OPENROUTER_MODEL;

// User-specified fallback models (free tier)
const USER_FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'deepseek/deepseek-chat-v3.1:free',
  'qwen/qwen3-235b-a22b:free',
  'deepseek/deepseek-r1-distill-llama-70b:free'
];

// Force Llama 3.3 as primary and exclude Llama 4 completely
const FORCED_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// Ensure we only use user-specified models, reject any Llama 4 models
const MODEL_FALLBACKS = [...USER_FALLBACK_MODELS];

console.log('🤖 AI Model Configuration:');
console.log('   Environment Model:', envModel || 'not set');
console.log('   Forced Model:', FORCED_MODEL);
console.log('   User Fallback Models:', USER_FALLBACK_MODELS);
console.log('   Model Fallbacks:', MODEL_FALLBACKS);
console.log('   Llama 4 Protection: ENABLED - Will reject any Llama 4 models');

function extractFirstJson(content) {
  if (!content || typeof content !== 'string') return null;
  const start = content.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = false; continue; }
      continue;
    } else {
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return content.slice(start, i + 1);
        }
      }
    }
  }
  return null;
}

function extractJsonCandidateFromString(content) {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  // Direct JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  // First brace-delimited
  const brace = extractFirstJson(content);
  if (brace) return brace;
  // Code block fenced
  const fence = '```';
  const firstFence = content.indexOf(fence);
  if (firstFence >= 0) {
    const secondFence = content.indexOf(fence, firstFence + fence.length);
    if (secondFence > firstFence) {
      const inside = content.slice(firstFence + fence.length, secondFence);
      const insideJson = extractFirstJson(inside);
      if (insideJson) return insideJson;
    }
  }
  // JSON snippet after colon
  const colonIdx = content.indexOf('{');
  if (colonIdx >= 0) {
    const after = content.slice(colonIdx);
    const afterJson = extractFirstJson(after);
    if (afterJson) return afterJson;
  }
  return null;
}

function sanitizeJsonCandidate(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') return null;
  let s = jsonStr;
  // Normalize smart quotes
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*(}[\s\n\r]*)/g, '$1');
  s = s.replace(/,\s*(][\s\n\r]*)/g, '$1');
  // Trim
  s = s.trim();
  return s;
}

function safeParseJson(candidate) {
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch (e1) {
    const cleaned = sanitizeJsonCandidate(candidate);
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      console.warn('🧪 optimize: JSON parse failed. Candidate preview:', cleaned.substring(0, 500));
      throw e2;
    }
  }
}

// Concurrency gate to limit parallel OpenRouter requests
export const AI_STATUS = {
  model: USER_FALLBACK_MODELS[0], // Use primary model from user-specified list
  last429: null,
  lastOk: null,
  lastCall: null,
  cooldownUntil: null,
  active: 0,
  queue: 0,
};
const MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT || 1);
let aiActive = 0;
const aiQueue = [];
async function acquireSlot() {
  if (aiActive < MAX_CONCURRENT) {
    aiActive++;
    AI_STATUS.active = aiActive;
    return;
  }
  await new Promise((resolve) => aiQueue.push(resolve));
  aiActive++;
  AI_STATUS.active = aiActive;
}
function releaseSlot() {
  aiActive = Math.max(0, aiActive - 1);
  AI_STATUS.active = aiActive;
  AI_STATUS.queue = Math.max(0, aiQueue.length - 1);
  const next = aiQueue.shift();
  if (next) next();
}
async function callOpenRouter(model, prompt, retries = 3) {
  // Validate model is from our approved list
  const isApprovedModel = USER_FALLBACK_MODELS.includes(model);
  const forcedModel = isApprovedModel ? model : USER_FALLBACK_MODELS[0];
  
  console.log('🔧 callOpenRouter: Original model requested:', model);
  console.log('🔧 callOpenRouter: Is approved model:', isApprovedModel);
  console.log('🔧 callOpenRouter: Final model to use:', forcedModel);
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }
  let OpenAI = null;
  try {
    const mod = await import('openai');
    OpenAI = mod.default || mod.OpenAI || null;
    console.log('✅ OpenAI SDK imported successfully:', !!OpenAI);
  } catch (importErr) {
    console.warn('⚠️  OpenAI SDK import failed, falling back to fetch:', importErr.message);
  }
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await acquireSlot();
    try {
      if (OpenAI) {
        const client = new OpenAI({
          baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
          apiKey
        });
        const completion = await client.chat.completions.create({
          model: forcedModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1000
        }, {
          headers: {
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:5176',
            'X-Title': process.env.OPENROUTER_TITLE || 'FixRez'
          }
        });
        AI_STATUS.lastOk = Date.now();
        return completion;
      } else {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:5176',
            'X-Title': process.env.OPENROUTER_TITLE || 'FixRez'
          },
          body: JSON.stringify({
            model: forcedModel,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 1000
          })
        });
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        if (!resp.ok) {
          const status = resp.status;
          const msg = data?.error?.message || data?.message || text || `Status ${status}`;
          const err = new Error(`${status} ${msg}`);
          err.status = status;
          err.details = data;
          err.model = model;
          lastErr = err;
          if ((status === 429 || status === 503) && attempt < retries) {
            AI_STATUS.last429 = Date.now();
            const retryAfterHeader = resp.headers?.get?.('retry-after');
            const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
            const base = retryAfterMs || 60_000;
            const backoff = base * Math.pow(2, attempt);
            const jitter = Math.floor(Math.random() * 2000);
            const waitMs = backoff + jitter;
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          throw err;
        }
        AI_STATUS.lastOk = Date.now();
        return data;
      }
    } finally {
      releaseSlot();
    }
  }
  throw lastErr || new Error('Unknown OpenRouter error');
}

function buildMockResume(resumeText, jobDescription) {
  return {
    header: { name: 'Dev User', contact: 'Toronto, ON • dev@localhost • 555-000-0000' },
    summary: `Professional with experience in ${jobDescription.substring(0, 40)}...`,
    experience: [
      {
        company: 'Acme Corp',
        location: 'Toronto, ON',
        dates: 'Jan 2020 - Present',
        title: 'Software Engineer',
        bullets: [
          'Built scalable React apps using TypeScript',
          'Developed Node.js APIs and integrated cloud services'
        ]
      }
    ],
    education: [
      { school: 'University of Toronto', location: 'Toronto, ON', dates: '2015 - 2019', degree: 'B.Sc. in Computer Science' }
    ],
    additional: {
      technical_skills: 'TypeScript, React, Node.js, AWS, Docker',
      languages: 'English',
      certifications: 'None'
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { resumeText, jobDescription, options, prompt } = req.body || {};

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ success: false, error: 'Missing resume or job description' });
    }

    const composePrompt = (rText, jDesc) => `Resume:\n${rText}\n\nJob Description:\n${jDesc}`;
    const truncate = (text, max) => (text || '').substring(0, max);

    // Provider spacing / cooldown checks
    const MIN_SPACING_MS = Number(process.env.AI_MIN_SPACING_MS || (process.env.NODE_ENV === 'development' ? 5_000 : 30_000));
    const COOLDOWN_MS = Number(process.env.AI_PROVIDER_COOLDOWN_MS || 300_000);
    const now = Date.now();
    if (AI_STATUS.cooldownUntil && now < AI_STATUS.cooldownUntil) {
      const waitMs = AI_STATUS.cooldownUntil - now;
      res.set('Retry-After', String(Math.ceil(waitMs/1000)));
      return res.status(429).json({ success: false, error: 'Rate limited', details: `Provider cooldown active. Wait ~${Math.ceil(waitMs/1000)}s and retry.`, cooldownUntil: new Date(AI_STATUS.cooldownUntil).toISOString() });
    }
    if (AI_STATUS.lastCall && now - AI_STATUS.lastCall < MIN_SPACING_MS) {
      const waitMs = MIN_SPACING_MS - (now - AI_STATUS.lastCall);
      res.set('Retry-After', String(Math.ceil(waitMs/1000)));
      return res.status(429).json({ success: false, error: 'Too frequent', details: `Please wait ~${Math.ceil(waitMs/1000)}s before next request.` });
    }
    AI_STATUS.lastCall = now;

    // Prefer provided prompt; otherwise compose prompt (apply truncation)
    const composedPrompt = prompt || composePrompt(truncate(resumeText, 3000), truncate(jobDescription, 2000));

    // Dev mock fallback to ensure UX during provider issues
    const hasKey = Boolean(process.env.OPENROUTER_API_KEY);
    const useMock = !hasKey && (String(process.env.DEV_AI_MOCK || '').toLowerCase() === 'true');
    const devBypass = false;
    console.log('🧪 optimize flags:', { DEV_AI_MOCK: useMock, DEV_AUTH_BYPASS: devBypass, user: req.user?.email || 'none' })
    if (useMock) {
      const mock = buildMockResume(resumeText, jobDescription);
      console.log('🧪 optimize: returning mock resume', { options })
      return res.status(200).json({ success: true, data: mock, warning: 'Using mock due to DEV flags.' });
    }

    let lastError = null;
    const attemptedModels = [];
    console.log('🧪 optimize: MODEL_FALLBACKS available:', MODEL_FALLBACKS);
    console.log('🧪 optimize: AI_STATUS.model:', AI_STATUS.model);
    for (const model of MODEL_FALLBACKS) {
      try {
        console.log('🧪 optimize: attempting model', model);
        console.log('🧪 optimize: calling callOpenRouter with model:', model);
        attemptedModels.push(model);
        const completion = await callOpenRouter(model, composedPrompt, 3);
        console.log('✅ callOpenRouter completed successfully');
        console.log('✅ Completion model used:', completion?.model || 'unknown');
        const choice = completion?.choices?.[0] || null;
        const message = choice?.message || {};
        let content = '';
        if (typeof message?.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message?.content)) {
          content = message.content
            .map((block) => {
              if (typeof block === 'string') return block;
              if (block && typeof block.text === 'string') return block.text;
              if (block && typeof block.content === 'string') return block.content;
              return '';
            })
            .join('\n')
            .trim();
        }
        if (!content && typeof choice?.text === 'string') {
          content = choice.text;
        }
        if (!content && completion && typeof completion === 'object') {
          const preview = JSON.stringify(completion).substring(0, 600);
        }
        console.log('🧪 optimize: response content length', content?.length || 0);
        if (!content || content.length === 0) {
          console.warn('🧪 optimize: empty content; attempting simplified prompt');
          // Retry with truncated inputs to avoid context overflow issues
          const shortPrompt = composePrompt(truncate(resumeText, 3000), truncate(jobDescription, 2000));
          const retry = await callOpenRouter(model, shortPrompt, 3);
          const rChoice = retry?.choices?.[0] || null;
          const rMsg = rChoice?.message || {};
          let rContent = '';
          if (typeof rMsg?.content === 'string') {
            rContent = rMsg.content;
          } else if (Array.isArray(rMsg?.content)) {
            rContent = rMsg.content
              .map((block) => (typeof block === 'string' ? block : (block?.text || block?.content || '')))
              .join('\n')
              .trim();
          }
          if (!rContent && typeof rChoice?.text === 'string') {
            rContent = rChoice.text;
          }
          console.log('🧪 optimize: retry content length', rContent?.length || 0);
          const rJson = extractJsonCandidateFromString(rContent);
          if (!rJson) throw new Error('No JSON found');
          console.log('🧪 optimize: retry jsonCandidate length', rJson.length);
          const rData = safeParseJson(rJson);
          return res.status(200).json({ success: true, data: rData, model });
        }
        const jsonCandidate = extractJsonCandidateFromString(content);
        if (!jsonCandidate) throw new Error('No JSON found');
        console.log('🧪 optimize: jsonCandidate length', jsonCandidate.length);
        const resumeData = safeParseJson(jsonCandidate);
        return res.status(200).json({ success: true, data: resumeData, model });
      } catch (e) {
        lastError = e;
        const status = (e && e.status) || 500;
        console.warn('OpenRouter model failed:', { model, status, message: e?.message });
        if ([401, 404, 429, 500, 503].includes(status)) {
          if (status === 429) {
            AI_STATUS.last429 = Date.now();
            AI_STATUS.cooldownUntil = AI_STATUS.last429 + Number(process.env.AI_PROVIDER_COOLDOWN_MS || 300_000);
          }
          continue;
        }
        continue;
      }
    }

    const status = (lastError && lastError.status) || 500;
    const msg = lastError?.message || 'Optimization failed';
    const lastModel = lastError?.model || attemptedModels[attemptedModels.length - 1] || null;
    if (status === 429) {
      return res.status(429).json({ success: false, error: 'Rate limited', details: 'We are hitting provider free-tier limits. Please wait 2–5 minutes and try again.', attemptedModels, lastModel, cooldownUntil: AI_STATUS.cooldownUntil ? new Date(AI_STATUS.cooldownUntil).toISOString() : null });
    }
    return res.status(500).json({ success: false, error: 'Optimization failed', details: msg, attemptedModels, lastModel });
  } catch (error) {
    console.error('Optimization error:', error?.message || error);
    return res.status(500).json({ 
      success: false,
      error: 'Optimization failed',
      details: error?.message || 'Unknown error'
    });
  }
}
