import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SYSTEM_PROMPT = `You are a resume optimization expert. Read the resume and job description, then return a JSON-optimized resume that includes relevant keywords from the job description.

Rules:
1. Return ONLY valid JSON
2. Keep it to one page
3. Use keywords from the job description
4. Be concise and professional
5. Use Canadian spelling
6. PROFESSIONAL EXPERIENCE: Select 2-3 MOST RELEVANT positions from the user's actual resume that align with the target job. Do NOT create fictional experience. Extract actual companies, dates, and achievements from the resume, then optimize the bullet points with job-relevant keywords and quantifiable results.
7. EXPERIENCE CALCULATION: Calculate total years of experience from the ACTUAL employment dates in the resume. Sum up all relevant work experience and reflect this accurately in the professional summary.
8. Technical Skills: Extract specific technologies, tools, and methodologies from the job description. For professional roles (financial planners, consultants, managers), focus on CORE COMPETENCIES and PROFESSIONAL SKILLS rather than specific software tools. Include: analytical skills, planning methodologies, regulatory knowledge, client relationship management, and industry-specific expertise. Only include specific software/tools if they are mentioned in the job description or are universally essential (like Excel for financial analysis).

JSON format:
{
  "header": {"name": "Name", "contact": "City, Province • email • phone"},
  "summary": "2-3 sentence summary with job keywords and ACCURATE years of experience calculated from resume dates",
  "experience": [{"company": "Actual Company from Resume", "location": "City, Province", "dates": "Actual Dates from Resume", "title": "Actual Title from Resume", "bullets": ["optimized achievement with keywords from job description"]}],
  "education": [{"school": "Name", "location": "City, Province", "dates": "Year - Year", "degree": "Degree"}],
  "additional": {"technical_skills": "core competencies and professional skills relevant to the role, focusing on methodologies, analytical skills, and industry expertise rather than specific software tools unless mentioned in job description", "languages": "languages", "certifications": "certs"}
}`;

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

function safeParseJson(candidate) {
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch (e1) {
    console.warn('JSON parse failed. Candidate preview:', candidate.substring(0, 500));
    throw e1;
  }
}

// Test data with multiple professional experiences
const testResume = `
JOHN SMITH
Toronto, ON • john.smith@email.com • 416-555-0123

PROFESSIONAL EXPERIENCE

Senior Financial Advisor | TD Bank | Toronto, ON | Jan 2020 - Present
• Managed portfolio of 150+ high-net-worth clients with assets exceeding $50M
• Developed comprehensive retirement income planning strategies
• Implemented tax minimization techniques resulting in 15% average tax savings
• Specialized in estate conservation and wealth transfer planning
• Achieved 95% client retention rate through exceptional service

Financial Planner | RBC Wealth Management | Toronto, ON | Jun 2015 - Dec 2019
• Created personalized financial plans for 200+ clients
• Conducted detailed financial needs analysis and risk assessments
• Recommended investment strategies including mutual funds and segregated funds
• Licensed to sell life insurance and annuity products
• Consistently exceeded sales targets by 20% annually

Junior Financial Analyst | Scotiabank | Toronto, ON | Sep 2012 - May 2015
• Assisted senior advisors with client portfolio analysis
• Prepared financial reports and investment performance summaries
• Supported retirement planning calculations and projections
• Maintained client database and CRM systems
• Completed Canadian Securities Course and Life License Qualification Program

EDUCATION
Bachelor of Commerce, Finance | University of Toronto | 2008 - 2012

CERTIFICATIONS
Certified Financial Planner (CFP) | 2018
Chartered Investment Manager (CIM) | 2016
`;

const testJobDescription = `
Senior Financial Advisor - Wealth Management

We are seeking an experienced Senior Financial Advisor to join our wealth management team. 
The ideal candidate will have expertise in retirement income planning, estate conservation 
strategies, tax minimization techniques, and wealth transfer planning. 

Key Requirements:
• Minimum 8+ years of financial planning experience
• Proven track record in retirement income planning
• Expertise in estate conservation and wealth transfer strategies
• Strong knowledge of tax minimization techniques
• Experience with high-net-worth client management
• CFP certification preferred
• Excellent client relationship management skills

Responsibilities:
• Develop comprehensive retirement income planning strategies
• Implement estate conservation and wealth transfer planning
• Provide tax minimization advice and strategies
• Manage and grow high-net-worth client relationships
• Conduct detailed financial needs analysis
`;

// Test the enhanced prompt
console.log('🧪 Testing Enhanced Professional Experience Extraction...');
console.log('📋 Test Resume has 3 positions spanning 2012-2024 (12+ years)');
console.log('🎯 Target Job: Senior Financial Advisor requiring 8+ years experience');
console.log('');

// Simulate the prompt that would be sent to AI
const testPrompt = `${SYSTEM_PROMPT}\n\nResume:\n${testResume}\n\nJob Description:\n${testJobDescription}`;

console.log('📝 Key Requirements for AI:');
console.log('✅ Select 2-3 MOST RELEVANT positions from actual resume');
console.log('✅ Extract actual companies (TD Bank, RBC, Scotiabank)');
console.log('✅ Use actual employment dates (2012-2024)');
console.log('✅ Calculate total experience: 12+ years');
console.log('✅ Optimize bullet points with job keywords');
console.log('✅ Focus on retirement planning, estate conservation, tax minimization');
console.log('');

console.log('🔍 Expected Results:');
console.log('• Should select Senior Financial Advisor (TD Bank) - most relevant');
console.log('• Should select Financial Planner (RBC) - relevant experience');
console.log('• May include Junior Analyst (Scotiabank) if space permits');
console.log('• Summary should mention "12+ years of financial planning experience"');
console.log('• Bullet points should include: retirement planning, estate conservation, tax minimization');
console.log('');

console.log('✅ Enhanced prompts now require AI to:');
console.log('1. Pull 2-3 relevant experiences FROM THE ACTUAL RESUME');
console.log('2. Calculate years of experience from REAL employment dates');
console.log('3. Use actual company names and employment periods');
console.log('4. Optimize existing achievements with job-relevant keywords');