# FixRez - Implementation Guide

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in your project root:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=deepseek/deepseek-r1

# Supabase Configuration (Optional - for user authentication)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## AI Integration - The Golden Prompt

### Core Optimization Prompt (Prompt A)

This is the exact prompt to use in your OpenRouter API calls:

```typescript
const OPTIMIZATION_PROMPT = `You are a senior ATS & recruiter expert.
Your task: take the USER RESUME and JOB DESCRIPTION, then output a **perfectly tailored, ATS-optimized resume** in **strict JSON**.

RULES:
1. Use EXACT keywords from the job description (preserve casing).
2. Every bullet must start with a strong action verb.
3. Quantify wherever possible (numbers, %, $).
4. Keep each bullet ≤ 2 lines.
5. Re-order sections: Summary → Experience → Skills → Education → Certifications.
6. Remove fluff ("team player", "hard-working").
7. Never hallucinate experience.

INPUT FORMAT:
=== JOB DESCRIPTION ===
{{JOB_DESCRIPTION}}

=== USER RESUME (raw text) ===
{{USER_RESUME}}

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "summary": "3-4 sentence professional summary",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company",
      "location": "City, State",
      "dates": "MMM YYYY – MMM YYYY",
      "bullets": ["bullet 1", "bullet 2", ...]
    }
  ],
  "skills": ["Skill 1", "Skill 2", ...],
  "education": [
    {
      "degree": "Degree",
      "school": "University",
      "dates": "YYYY – YYYY"
    }
  ],
  "certifications": ["Cert 1", "Cert 2"]
}`;
```

### API Implementation Example

```typescript
// /api/optimize.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobDescription, resumeText } = req.body;

  try {
    const prompt = OPTIMIZATION_PROMPT
      .replace('{{JOB_DESCRIPTION}}', jobDescription)
      .replace('{{USER_RESUME}}', resumeText);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL,
        'X-Title': 'FixRez'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    const data = await response.json();
    const optimizedResume = JSON.parse(data.choices[0].message.content);

    res.status(200).json({
      success: true,
      data: optimizedResume
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize resume'
    });
  }
}
```

## Quick Start Commands

### 1. Initialize Next.js Project

```bash
npx create-next-app@latest resumeforge-ai --typescript --tailwind --eslint --app
cd resumeforge-ai
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install @supabase/supabase-js
npm install pdf-parse mammoth
npm install react-pdf docx
npm install @radix-ui/react-dialog @radix-ui/react-button
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge

# Development dependencies
npm install -D @types/pdf-parse
```

### 3. Setup ShadCN UI

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add card
```

## Development Phases

### Phase 1: Core MVP (Week 1-2)

* [ ] Setup Next.js project with TypeScript and Tailwind

* [ ] Create landing page with hero section

* [ ] Build optimization wizard UI (5 steps)

* [ ] Implement file upload and text parsing

* [ ] Integrate OpenRouter API with DeepSeek R1

* [ ] Add basic export functionality (PDF/text)

### Phase 2: Enhanced Features (Week 3)

* [ ] Add Supabase authentication

* [ ] Create user dashboard

* [ ] Implement optimization history

* [ ] Add live preview with editing

* [ ] Enhance export options (Word, JSON-LD)

### Phase 3: Polish & Deploy (Week 4)

* [ ] Add responsive design improvements

* [ ] Implement error handling and loading states

* [ ] Add usage analytics and limits

* [ ] Deploy to Vercel

* [ ] Setup custom domain and monitoring

## Key Implementation Notes

1. **File Processing**: Use `pdf-parse` for PDFs and `mammoth` for DOCX files in API routes
2. **AI Response Parsing**: Always validate JSON response from DeepSeek R1 and handle parsing errors
3. **Rate Limiting**: Implement usage limits for guest users (2 optimizations/day)
4. **Export Generation**: Use `react-pdf` for PDF generation and `docx` library for Word exports
5. **Error Handling**: Provide clear error messages for file parsing, AI processing, and export failures
6. **Security**: Never expose API keys in frontend code, use environment variables
7. **Performance**: Implement loading states and progress indicators for AI processing

## Testing Strategy

* Unit tests for file parsing utilities

* Integration tests for API endpoints

* E2E tests for complete optimization workflow

* Manual testing with various resume formats and job descriptions

* Performance testing with large files and concurrent users

