// Test script to demonstrate dynamic keyword extraction from job descriptions
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const DYNAMIC_SYSTEM_PROMPT = `You are a resume optimization expert. Read the resume and job description, then return a JSON-optimized resume that includes relevant keywords from the job description.

Rules:
1. Return ONLY valid JSON
2. Keep it to one page
3. Use keywords from the job description
4. Be concise and professional
5. Use Canadian spelling
6. DYNAMIC KEYWORD EXTRACTION: Carefully analyze the job description and extract ALL relevant keywords, skills, tools, technologies, methodologies, and requirements mentioned. For the technical_skills field, include:
   - Specific technologies, tools, and software mentioned in the job description
   - Required skills and competencies explicitly stated
   - Industry-specific knowledge areas and methodologies
   - Analytical and professional skills relevant to the role
   - ONLY include skills/technologies that are actually mentioned in the job description or are directly implied by the role requirements
   - Do NOT add generic or assumed skills that aren't mentioned

JSON format:
{
  "header": {"name": "Name", "contact": "City, Province • email • phone"},
  "summary": "2-3 sentence summary with job keywords",
  "experience": [{"company": "Name", "location": "City, Province", "dates": "MMM YYYY - MMM YYYY", "title": "Title", "bullets": ["achievement with keywords"]}],
  "education": [{"school": "Name", "location": "City, Province", "dates": "Year - Year", "degree": "Degree"}],
  "additional": {"technical_skills": "dynamically extracted keywords and skills from the job description, focusing only on what is explicitly mentioned or required", "languages": "languages", "certifications": "certs"}
}`;

async function testDynamicKeywords() {
  console.log('🧪 Testing dynamic keyword extraction from job descriptions...');
  console.log('🔑 API Key present:', !!OPENROUTER_API_KEY);
  
  if (!OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable');
    return;
  }

  // Test case 1: Financial Planner with specific keywords
  const financialPlannerTest = `Resume:
Sarah Johnson
Senior Financial Advisor with 10 years experience
Toronto, ON • sarah@email.com • 555-987-1234

Experience:
Senior Financial Planner at WealthCorp (2018-2024)
- Developed comprehensive financial plans for high-net-worth clients
- Provided investment and retirement planning advice
- Managed client portfolios and conducted regular reviews

Financial Advisor at Royal Bank (2014-2018)
- Created personalized investment strategies
- Conducted financial needs analysis and risk assessments

Education:
University of Toronto, B.Com Finance (2010-2014)
Certified Financial Planner (CFP)

Job Description:
We are seeking an experienced Financial Planner with expertise in retirement income planning, estate conservation strategies, tax minimization techniques, and wealth transfer planning. Must have strong knowledge of mutual funds, segregated funds, annuities, and life insurance products. Experience with high-net-worth client relationship management, financial needs analysis, and investment portfolio management required. Proficiency in financial planning software and client management systems preferred. Must understand regulatory compliance, risk management, and fiduciary responsibilities.

Please optimize this resume for the job description.`;

  // Test case 2: Software Developer with specific technologies
  const softwareDeveloperTest = `Resume:
Michael Chen
Full Stack Developer with 6 years experience
Vancouver, BC • michael@email.com • 555-456-7890

Experience:
Senior Developer at TechCorp (2020-2024)
- Built web applications and APIs
- Worked on database design and optimization
- Collaborated with team on software projects

Developer at StartupXYZ (2018-2020)
- Developed frontend interfaces and backend services
- Participated in code reviews and testing

Education:
UBC, B.Sc Computer Science (2014-2018)

Job Description:
We need a Full Stack Developer experienced in React, Node.js, MongoDB, PostgreSQL, Docker, AWS, and Git. Must have expertise in RESTful API development, microservices architecture, cloud deployment, and CI/CD pipelines. Experience with TypeScript, GraphQL, Redis, Jenkins, and Agile methodologies required. Knowledge of test-driven development, container orchestration, and serverless functions preferred.

Please optimize this resume for the job description.`;

  // Test case 3: Marketing Manager with digital marketing focus
  const marketingManagerTest = `Resume:
Jennifer Williams
Marketing Professional with 8 years experience
Calgary, AB • jennifer@email.com • 555-789-4567

Experience:
Marketing Manager at GrowthCorp (2019-2024)
- Developed marketing campaigns and managed social media
- Created content and analyzed campaign performance
- Led marketing team and managed budgets

Marketing Coordinator at BrandAgency (2016-2019)
- Assisted with campaign development and execution
- Managed social media accounts and content creation

Education:
University of Calgary, BBA Marketing (2012-2016)

Job Description:
Seeking a Digital Marketing Manager with expertise in Google Analytics, Google Ads, Facebook Business Manager, HubSpot, Mailchimp, and Hootsuite. Must have experience with SEO/SEM strategies, content marketing, email marketing automation, social media advertising, and conversion rate optimization. Proficiency in Adobe Creative Suite, WordPress, HTML/CSS, and marketing analytics required. Experience with A/B testing, customer journey mapping, and marketing funnel optimization preferred.

Please optimize this resume for the job description.`;

  const testCases = [
    { name: 'Financial Planner', content: financialPlannerTest },
    { name: 'Software Developer', content: softwareDeveloperTest },
    { name: 'Marketing Manager', content: marketingManagerTest }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    
    const body = {
      model: 'meta-llama/llama-4-maverick:free',
      messages: [
        { role: 'system', content: DYNAMIC_SYSTEM_PROMPT },
        { role: 'user', content: testCase.content }
      ],
      temperature: 0.2,
      max_tokens: 1000
    };

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'FixRez Dynamic Keywords Test'
        },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      
      if (!response.ok) {
        console.error('❌ API call failed:', response.status, text);
        continue;
      }

      const data = JSON.parse(text);
      const content = data.choices?.[0]?.message?.content;
      
      if (content) {
        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedJson = JSON.parse(jsonMatch[0]);
            const skills = parsedJson.additional?.technical_skills || 'Not found';
            const summary = parsedJson.summary || 'Not found';
            
            console.log('📋 Technical Skills:', skills);
            console.log('📝 Summary:', summary);
            
            // Analyze keyword extraction quality
            const skillsList = skills.toLowerCase().split(',').map(s => s.trim());
            
            if (testCase.name === 'Financial Planner') {
              const expectedKeywords = [
                'retirement income planning', 'estate conservation', 'tax minimization', 
                'wealth transfer planning', 'mutual funds', 'segregated funds', 
                'annuities', 'life insurance', 'financial needs analysis', 
                'investment portfolio management', 'regulatory compliance', 'risk management'
              ];
              const foundKeywords = expectedKeywords.filter(keyword => 
                skillsList.some(skill => skill.includes(keyword.replace(/ /g, '')) || 
                keyword.split(' ').some(word => skillsList.some(skill => skill.includes(word)))
              ));
              console.log(`🔍 Found ${foundKeywords.length}/${expectedKeywords.length} expected financial planning keywords`);
            }
            
            if (testCase.name === 'Software Developer') {
              const expectedTechnologies = [
                'react', 'node.js', 'mongodb', 'postgresql', 'docker', 'aws', 
                'git', 'typescript', 'graphql', 'redis', 'jenkins'
              ];
              const foundTechnologies = expectedTechnologies.filter(tech => 
                skillsList.some(skill => skill.includes(tech.toLowerCase()))
              );
              console.log(`🔍 Found ${foundTechnologies.length}/${expectedTechnologies.length} expected technologies`);
            }
            
            if (testCase.name === 'Marketing Manager') {
              const expectedMarketingTools = [
                'google analytics', 'google ads', 'facebook business manager', 
                'hubspot', 'mailchimp', 'hootsuite', 'seo/sem', 'adobe creative suite',
                'wordpress', 'html/css'
              ];
              const foundTools = expectedMarketingTools.filter(tool => 
                skillsList.some(skill => skill.includes(tool.toLowerCase().replace(/\//g, '')))
              );
              console.log(`🔍 Found ${foundTools.length}/${expectedMarketingTools.length} expected marketing tools`);
            }
            
            console.log(`📊 Skills count: ${skillsList.length}`);
            
          } catch (parseError) {
            console.warn('⚠️ Could not parse extracted JSON:', parseError.message);
          }
        }
      }

    } catch (error) {
      console.error('💥 Test failed with error:', error.message);
    }
  }
}

// Run the dynamic keywords test
testDynamicKeywords().catch(console.error);