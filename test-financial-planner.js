// Test script to reproduce and fix the financial planner technical skills issue
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const CURRENT_SYSTEM_PROMPT = `You are a resume optimization expert. Read the resume and job description, then return a JSON-optimized resume that includes relevant keywords from the job description.

Rules:
1. Return ONLY valid JSON
2. Keep it to one page
3. Use keywords from the job description
4. Be concise and professional
5. Use Canadian spelling
6. Technical Skills: Extract specific technologies, tools, and methodologies from the job description. If none mentioned, include role-relevant skills (e.g., React/Node.js for developer roles, Photoshop/Figma for design roles, Excel/SQL for data roles). Prioritize job-matching skills over generic ones.

JSON format:
{
  "header": {"name": "Name", "contact": "City, Province • email • phone"},
  "summary": "2-3 sentence summary with job keywords",
  "experience": [{"company": "Name", "location": "City, Province", "dates": "MMM YYYY - MMM YYYY", "title": "Title", "bullets": ["achievement with keywords"]}],
  "education": [{"school": "Name", "location": "City, Province", "dates": "Year - Year", "degree": "Degree"}],
  "additional": {"technical_skills": "role-specific technical skills extracted from job description or commonly relevant for this position type", "languages": "languages", "certifications": "certs"}
}`;

const ENHANCED_SYSTEM_PROMPT = `You are a resume optimization expert. Read the resume and job description, then return a JSON-optimized resume that includes relevant keywords from the job description.

Rules:
1. Return ONLY valid JSON
2. Keep it to one page
3. Use keywords from the job description
4. Be concise and professional
5. Use Canadian spelling
6. Technical Skills: Extract specific technologies, tools, and methodologies from the job description. For professional roles (financial planners, consultants, managers), focus on CORE COMPETENCIES and PROFESSIONAL SKILLS rather than specific software tools. Include: analytical skills, planning methodologies, regulatory knowledge, client relationship management, and industry-specific expertise. Only include specific software/tools if they are mentioned in the job description or are universally essential (like Excel for financial analysis).

JSON format:
{
  "header": {"name": "Name", "contact": "City, Province • email • phone"},
  "summary": "2-3 sentence summary with job keywords",
  "experience": [{"company": "Name", "location": "City, Province", "dates": "MMM YYYY - MMM YYYY", "title": "Title", "bullets": ["achievement with keywords"]}],
  "education": [{"school": "Name", "location": "City, Province", "dates": "Year - Year", "degree": "Degree"}],
  "additional": {"technical_skills": "core competencies and professional skills relevant to the role, focusing on methodologies, analytical skills, and industry expertise rather than specific software tools unless mentioned in job description", "languages": "languages", "certifications": "certs"}
}`;

async function testFinancialPlannerSkills() {
  console.log('🧪 Testing financial planner technical skills generation...');
  console.log('🔑 API Key present:', !!OPENROUTER_API_KEY);
  
  if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable');
    return;
  }

  const financialPlannerPrompt = `Resume:
David Thompson
Senior Financial Planner with 10 years experience
Toronto, ON • david@email.com • 555-123-4567

Experience:
Senior Financial Advisor at WealthManagement Corp (2018-2024)
- Developed comprehensive financial plans for high-net-worth clients
- Provided investment advice and portfolio management services
- Conducted retirement planning and estate planning consultations

Financial Planner at MoneyWise Advisors (2014-2018)
- Created personalized financial strategies for clients
- Analyzed market trends and investment opportunities
- Managed client relationships and provided ongoing financial guidance

Education:
University of Toronto, B.Com Finance (2010-2014)
Certified Financial Planner (CFP) designation

Job Description:
We are seeking an experienced Financial Planner to join our wealth management team. The ideal candidate will have strong expertise in financial planning, investment planning, retirement planning, tax planning, and estate planning. Must possess excellent analytical skills, client relationship management abilities, and comprehensive knowledge of financial products and markets. CFP designation preferred.

Please optimize this resume for the job description.`;

  const body1 = {
    model: 'meta-llama/llama-4-maverick:free',
    messages: [
      { role: 'system', content: CURRENT_SYSTEM_PROMPT },
      { role: 'user', content: financialPlannerPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1000
  };

  const body2 = {
    model: 'meta-llama/llama-4-maverick:free',
    messages: [
      { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
      { role: 'user', content: financialPlannerPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1000
  };

  async function runTest(body, testName) {
    console.log(`\n🧪 ${testName}:`);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'FixRez Financial Planner Test'
        },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      
      if (!response.ok) {
        console.error('❌ API call failed:', response.status, text);
        return;
      }

      const data = JSON.parse(text);
      const content = data.choices?.[0]?.message?.content;
      
      if (content) {
        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedJson = JSON.parse(jsonMatch[0]);
            console.log('📋 Technical Skills:', parsedJson.additional?.technical_skills || 'Not found');
            console.log('📝 Summary:', parsedJson.summary || 'Not found');
            
            // Analyze technical skills quality for financial planner
            const skills = parsedJson.additional?.technical_skills || '';
            const expectedCoreSkills = ['financial planning', 'investment planning', 'retirement planning', 'tax planning', 'estate planning', 'analytical skills', 'client relationship'];
            const foundCoreSkills = expectedCoreSkills.filter(skill => skills.toLowerCase().includes(skill.toLowerCase()));
            console.log(`🔍 Found ${foundCoreSkills.length}/${expectedCoreSkills.length} expected core skills:`, foundCoreSkills);
            
            // Check for problematic specific tools
            const problematicTools = ['Conquest', 'MyAdvisor', 'TD Web Broker', 'Thinks or Swims'];
            const foundProblematic = problematicTools.filter(tool => skills.toLowerCase().includes(tool.toLowerCase()));
            if (foundProblematic.length > 0) {
              console.log('⚠️ Found problematic specific tools:', foundProblematic);
            } else {
              console.log('✅ No problematic specific tools found');
            }
            
          } catch (parseError) {
            console.warn('⚠️ Could not parse extracted JSON:', parseError.message);
          }
        }
      }

    } catch (error) {
      console.error('💥 Test failed with error:', error.message);
    }
  }

  // Run both tests (current vs enhanced)
  await runTest(body1, 'Current System Prompt');
  await runTest(body2, 'Enhanced System Prompt');
}

// Run the financial planner test
testFinancialPlannerSkills().catch(console.error);