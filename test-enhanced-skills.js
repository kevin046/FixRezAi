// Test script to verify enhanced technical skills generation
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
6. Technical Skills: Extract specific technologies, tools, and methodologies from the job description. If none mentioned, include role-relevant skills (e.g., React/Node.js for developer roles, Photoshop/Figma for design roles, Excel/SQL for data roles). Prioritize job-matching skills over generic ones.

JSON format:
{
  "header": {"name": "Name", "contact": "City, Province • email • phone"},
  "summary": "2-3 sentence summary with job keywords",
  "experience": [{"company": "Name", "location": "City, Province", "dates": "MMM YYYY - MMM YYYY", "title": "Title", "bullets": ["achievement with keywords"]}],
  "education": [{"school": "Name", "location": "City, Province", "dates": "Year - Year", "degree": "Degree"}],
  "additional": {"technical_skills": "role-specific technical skills extracted from job description or commonly relevant for this position type", "languages": "languages", "certifications": "certs"}
}`;

async function testEnhancedSkills() {
  console.log('🧪 Testing enhanced technical skills generation...');
  console.log('🔑 API Key present:', !!OPENROUTER_API_KEY);
  
  if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable');
    return;
  }

  // Test case 1: Job with specific technical requirements
  const testPrompt1 = `Resume:
Sarah Johnson
Marketing Manager with 6 years experience
Toronto, ON • sarah@email.com • 555-987-6543

Experience:
Marketing Manager at TechStart Inc. (2019-2024)
- Developed and executed digital marketing campaigns
- Managed social media presence and content strategy
- Analyzed campaign performance and optimized strategies

Education:
Ryerson University, BBA Marketing (2015-2019)

Job Description:
We are seeking a Digital Marketing Specialist with expertise in Google Analytics, SEO/SEM, HubSpot, and Adobe Creative Suite. Must have experience with marketing automation tools, CRM systems, and data-driven campaign optimization. Knowledge of HTML/CSS, WordPress, and email marketing platforms required.

Please optimize this resume for the job description.`;

  // Test case 2: Job with no specific technical requirements
  const testPrompt2 = `Resume:
Michael Chen
Project Manager with 8 years experience
Vancouver, BC • michael@email.com • 555-456-7890

Experience:
Senior Project Manager at BuildCorp (2018-2024)
- Led cross-functional teams on major construction projects
- Managed project timelines, budgets, and stakeholder communications
- Implemented process improvements and quality control measures

Education:
UBC, B.Sc Civil Engineering (2012-2016)

Job Description:
We need an experienced Project Manager to oversee construction projects. Must have strong leadership skills, excellent communication abilities, and proven track record of delivering projects on time and within budget.

Please optimize this resume for the job description.`;

  const body1 = {
    model: 'meta-llama/llama-4-maverick:free',
    messages: [
      { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
      { role: 'user', content: testPrompt1 }
    ],
    temperature: 0.2,
    max_tokens: 1000
  };

  const body2 = {
    model: 'meta-llama/llama-4-maverick:free',
    messages: [
      { role: 'system', content: ENHANCED_SYSTEM_PROMPT },
      { role: 'user', content: testPrompt2 }
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
          'X-Title': 'FixRez Enhanced Test'
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
            console.log('✅ Generated resume:');
            console.log('📋 Technical Skills:', parsedJson.additional?.technical_skills || 'Not found');
            console.log('📝 Summary:', parsedJson.summary || 'Not found');
            
            // Analyze technical skills quality
            const skills = parsedJson.additional?.technical_skills || '';
            if (testName.includes('specific technical')) {
              const expectedTools = ['Google Analytics', 'SEO', 'HubSpot', 'Adobe', 'HTML', 'WordPress'];
              const foundTools = expectedTools.filter(tool => skills.toLowerCase().includes(tool.toLowerCase()));
              console.log(`🔍 Found ${foundTools.length}/${expectedTools.length} expected tools:`, foundTools);
            } else {
              const hasGeneralSkills = skills.length > 10 && skills.includes(',');
              console.log(`🔍 Has comprehensive skills list: ${hasGeneralSkills ? 'Yes' : 'No'}`);
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

  // Run both tests
  await runTest(body1, 'Test 1: Job with specific technical requirements');
  await runTest(body2, 'Test 2: Job with no specific technical requirements');
}

// Run the enhanced test
testEnhancedSkills().catch(console.error);