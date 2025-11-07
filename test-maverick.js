#!/usr/bin/env node

/**
 * Test script for Meta Llama 4 Maverick (OpenRouter)
 * - Verifies model connectivity and response
 * - Sends realistic resume + job description
 * - Prints raw response and attempts JSON parsing
 * - Handles free-tier 429 rate limits with delay retries
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.OPENROUTER_API_KEY;
const REFERER = process.env.OPENROUTER_REFERER || 'http://localhost:5176';
const TITLE = process.env.OPENROUTER_TITLE || 'FixRez';
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-4-maverick:free';

if (!API_KEY) {
  console.error('❌ Missing OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

const sample = {
  jobTitle: 'Senior Full Stack Developer',
  resumeText: `John Doe\nSenior Software Engineer\n\nEXPERIENCE\nAcme Corp — Senior Engineer (2021–Present)\n- Led development of React/Node apps\n- Scaled REST APIs; improved reliability\n- Mentored team; drove code reviews\n\nBeta Labs — Software Engineer (2018–2021)\n- Built Node.js microservices; AWS integrations\n- Automated CI/CD with GitHub Actions\n\nSKILLS\nJavaScript, TypeScript, React, Node.js, Express, Postgres, MongoDB, AWS, Docker\n\nEDUCATION\nB.S. Computer Science — Tech University (2014–2018)`,
  jobDescription: `Looking for a Senior Full Stack Developer with React, Node.js, TypeScript, AWS. Responsibilities: build scalable web apps, mentor, collaborate, code reviews. Requirements: 4+ yrs full‑stack, strong TS/React, Node.js, AWS, CI/CD.`
};

function buildMessages() {
  const system = {
    role: 'system',
    content: 'You are a resume optimization assistant. Return strictly a JSON object only. No explanations or markdown. Fields: {"optimizedResume": string, "summary": string, "keywords": string[]}.'
  };
  const user = {
    role: 'user',
    content: `Job Title:\n${sample.jobTitle}\n\nResume:\n${sample.resumeText}\n\nJob Description:\n${sample.jobDescription}\n\nTask: Optimize the resume for this job. Keep content concise, measurable, and tailored. Return ONLY JSON with fields {optimizedResume, summary, keywords}.`
  };
  return [system, user];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractJson(text) {
  if (!text) return null;
  let cleaned = text.replace(/^```[a-zA-Z]*\n|```$/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    try { return JSON.parse(slice); } catch {}
  }
  return null;
}

async function callOnce() {
  const body = {
    model: MODEL,
    messages: buildMessages(),
    max_tokens: 600,
    temperature: 0.2
  };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': REFERER,
      'X-Title': TITLE
    },
    body: JSON.stringify(body)
  });
  const rawText = await res.text();
  return { status: res.status, ok: res.ok, rawText };
}

async function run() {
  console.log('🚀 Maverick direct test via OpenRouter');
  console.log(`🔧 Model: ${MODEL}`);
  console.log(`🔑 Key prefix: ${API_KEY.slice(0, 8)}...`);

  const delays = [30000, 60000, 120000];
  let attempt = 0;
  let lastRaw = '';

  while (attempt <= delays.length) {
    attempt += 1;
    console.log(`\n📤 Attempt ${attempt} sending request...`);
    const t0 = Date.now();
    const { status, ok, rawText } = await callOnce();
    const dt = Date.now() - t0;

    console.log(`📊 Status: ${status} (in ${dt}ms)`);
    console.log('📄 Raw response (first 600 chars):');
    console.log((rawText || '').slice(0, 600));
    lastRaw = rawText;

    if (ok) {
      console.log('\n✅ Request succeeded');
      let payload; try { payload = JSON.parse(rawText); } catch {}
      const content = payload?.choices?.[0]?.message?.content || '';
      console.log('\n💬 Model content (first 600 chars):');
      console.log(content.slice(0, 600));
      const parsed = extractJson(content);
      if (!parsed) {
        console.log('\n⚠️ Could not parse JSON from model output.');
      } else {
        console.log('\n🧩 Parsed JSON keys:', Object.keys(parsed));
        const preview = parsed.optimizedResume?.slice(0, 300) || '';
        console.log('📝 Optimized resume preview (first 300 chars):');
        console.log(preview);
        console.log('🔎 Keywords:', Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10).join(', ') : 'N/A');
      }
      return;
    }

    if (status === 429) {
      const waitMs = delays[attempt - 1] || 120000;
      const until = new Date(Date.now() + waitMs).toLocaleTimeString();
      console.log(`\n⏳ Rate limited (429). Waiting ${Math.round(waitMs/1000)}s until ${until} then retry...`);
      await sleep(waitMs);
      continue;
    }

    console.log('\n❌ Non-OK response, aborting further attempts.');
    break;
  }

  console.log('\n🏁 Test finished.');
  if (lastRaw) {
    console.log('📦 Last raw response snapshot (first 600 chars):');
    console.log(lastRaw.slice(0, 600));
  }
}

run().catch((err) => {
  console.error('💥 Script error:', err?.message || err);
  process.exit(1);
});