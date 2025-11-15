// Final test script to verify the enhanced financial planner skills generation
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

async function testFinalFinancialPlanner() {
  console.log('🧪 Testing final enhanced financial planner skills generation...');
  console.log('🔑 API Key present:', !!OPENROUTER_API_KEY);
  
  if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable');
    return;
  }

  // Test case 1: Financial Planner with job-specific keywords
  const financialPlannerPrompt1 = `Resume:
Jennifer Martinez
Senior Financial Planner with 12 years experience
Calgary, AB • jennifer@email.com • 555-234-5678

Experience:
Senior Financial Advisor at Premier Wealth Management (2016-2024)
- Developed comprehensive financial plans for high-net-worth clients
- Managed investment portfolios and conducted risk assessments
- Provided retirement and estate planning consultations

Financial Consultant at Royal Bank (2012-2016)
- Created personalized investment strategies
- Analyzed market trends and economic indicators
- Built long-term client relationships

Education:
University of Calgary, B.Com Finance (2008-2012)
Certified Financial Planner (CFP) designation

Job Description:
We are seeking an experienced Financial Planner to provide comprehensive financial planning services. The ideal candidate will have expertise in financial planning, investment planning, retirement planning, tax planning, and estate planning. Must possess strong analytical skills, excellent client relationship management abilities, and comprehensive knowledge of financial products and markets. CFP designation required. Experience with wealth management and risk assessment essential.

Please optimize this resume for the job description.`;

  // Test case 2: Financial Planner with generic job description (no specific tools mentioned)
  const financialPlannerPrompt2 = `Resume:
Robert Chen
Financial Planner with 8 years experience
Toronto, ON • robert@email.com • 555-789-1234

Experience:
Financial Planner at TD Wealth (2018-2024)
- Provided financial planning and investment advice
- Managed client portfolios and conducted reviews
- Developed retirement strategies for clients

Associate Advisor at Scotiabank (2016-2018)
- Assisted with financial planning processes
- Conducted client meetings and assessments

Education:
Ryerson University, BBA Finance (2012-2016)
CFP certification

Job Description:
Looking for a Financial Planner to join our team. Must have experience in financial planning, strong communication skills, and ability to work with clients. Good analytical skills and knowledge of financial products required.

Please optimize this resume for the job description.`;

  const body1 = {
    model: 'meta-llama/llama-4-maverick:free',
    messages: [
      { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
      { role: 'user', content: financialPlannerPrompt1 }
    ],
    temperature: 0.2,
    max_tokens: 1000
  };

  const body2 = {
    model: 'meta-llama/llama-4-maverick:free',
    messages: [
      { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
      { role: 'user', content: financialPlannerPrompt2 }
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
          'X-Title': 'FixRez Final Financial Planner Test'
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
            
            // Expected core financial planning competencies
            const expectedCoreSkills = [
              'financial planning', 'investment planning', 'retirement planning', 
              'tax planning', 'estate planning', 'wealth management', 'risk assessment',
              'analytical skills', 'client relationship', 'financial products',
              'portfolio management', 'market analysis', 'risk management'
            ];
            
            const foundCoreSkills = expectedCoreSkills.filter(skill => 
              skills.toLowerCase().includes(skill.toLowerCase())
            );
            console.log(`🔍 Found ${foundCoreSkills.length}/${expectedCoreSkills.length} expected core competencies:`, foundCoreSkills);
            
            // Check for problematic specific financial tools
            const problematicTools = [
              'Conquest', 'MyAdvisor', 'TD Web Broker', 'Thinks or Swims', 
              'Mobile Apps', 'CRM software', 'specific platform names'
            ];
            const foundProblematic = problematicTools.filter(tool => 
              skills.toLowerCase().includes(tool.toLowerCase())
            );
            if (foundProblematic.length > 0) {
              console.log('⚠️ Found problematic specific tools:', foundProblematic);
            } else {
              console.log('✅ No problematic specific tools found');
            }
            
            // Check if skills are comprehensive and relevant
            const hasComprehensiveSkills = skills.split(',').length >= 4;
            const hasPlanningFocus = skills.toLowerCase().includes('planning');
            const hasAnalysisFocus = skills.toLowerCase().includes('analytical') || skills.toLowerCase().includes('analysis');
            
            console.log(`📊 Quality Analysis:`);
            console.log(`   - Comprehensive skills list: ${hasComprehensiveSkills ? 'Yes' : 'No'} (${skills.split(',').length} items)`);
            console.log(`   - Planning focus: ${hasPlanningFocus ? 'Yes' : 'No'}`);
            console.log(`   - Analysis focus: ${hasAnalysisFocus ? 'Yes' : 'No'}`);
            
          } catch (parseError) {
            console.warn('⚠️ Could not parse extracted JSON:', parseError.message);
          }
        }
      }

    } catch (error) {
      console.error('💥 Test failed with error:', error.message);
    }
  }

  // Run both tests
  await runTest(body1, 'Test 1: Detailed Financial Planner Job');
  await runTest(body2, 'Test 2: Generic Financial Planner Job');
}

// Run the final financial planner test
testFinalFinancialPlanner().catch(console.error);