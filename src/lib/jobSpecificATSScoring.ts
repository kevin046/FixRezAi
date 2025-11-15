import { OptimizedResume } from '@/types/resume';

export interface JobSpecificATSScore {
  totalScore: number;
  jobMatch: {
    score: number;
    keywordsFound: string[];
    keywordsMissing: string[];
    keywordMatchPercentage: number;
  };
  skillsAlignment: {
    score: number;
    requiredSkillsFound: string[];
    requiredSkillsMissing: string[];
    skillsMatchPercentage: number;
  };
  experienceRelevance: {
    score: number;
    relevantYears: number;
    requiredYears: number;
    experienceMatch: boolean;
    details: string[];
  };
  educationRequirements: {
    score: number;
    requiredEducationFound: boolean;
    educationLevel: string;
    details: string[];
  };
  overallAssessment: {
    matchLevel: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    keyStrengths: string[];
    improvementAreas: string[];
    nextSteps: string[];
  };
}

export interface JobRequirements {
  title: string;
  description: string;
  requiredKeywords: string[];
  requiredSkills: string[];
  requiredYearsExperience: number;
  requiredEducation: string[];
  preferredQualifications: string[];
}

// Common job titles and their typical requirements
const JOB_TEMPLATES: Record<string, Partial<JobRequirements>> = {
  'software engineer': {
    requiredKeywords: ['programming', 'coding', 'development', 'software', 'technical'],
    requiredSkills: ['JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'SQL', 'Git'],
    requiredYearsExperience: 2,
    requiredEducation: ['bachelor', 'bs', 'ba', 'computer science', 'software engineering']
  },
  'data scientist': {
    requiredKeywords: ['data analysis', 'machine learning', 'statistics', 'python', 'sql'],
    requiredSkills: ['Python', 'R', 'SQL', 'Machine Learning', 'Statistics', 'Pandas', 'Scikit-learn'],
    requiredYearsExperience: 3,
    requiredEducation: ['bachelor', 'master', 'phd', 'data science', 'statistics', 'mathematics']
  },
  'product manager': {
    requiredKeywords: ['product', 'management', 'strategy', 'roadmap', 'stakeholder'],
    requiredSkills: ['Product Strategy', 'Agile', 'Scrum', 'Data Analysis', 'Communication', 'Leadership'],
    requiredYearsExperience: 3,
    requiredEducation: ['bachelor', 'mba', 'business', 'management']
  },
  'marketing manager': {
    requiredKeywords: ['marketing', 'campaign', 'digital marketing', 'seo', 'social media'],
    requiredSkills: ['Digital Marketing', 'SEO', 'Content Marketing', 'Analytics', 'Social Media', 'Email Marketing'],
    requiredYearsExperience: 2,
    requiredEducation: ['bachelor', 'marketing', 'business', 'communications']
  }
};

export function analyzeResumeAgainstJob(resume: OptimizedResume, jobTitle: string, jobDescription: string): JobSpecificATSScore {
  const jobRequirements = extractJobRequirements(jobTitle, jobDescription);
  
  const keywordAnalysis = analyzeKeywordMatch(resume, jobRequirements);
  const skillsAnalysis = analyzeSkillsAlignment(resume, jobRequirements);
  const experienceAnalysis = analyzeExperienceRelevance(resume, jobRequirements);
  const educationAnalysis = analyzeEducationRequirements(resume, jobRequirements);
  
  const totalScore = calculateJobSpecificScore(keywordAnalysis, skillsAnalysis, experienceAnalysis, educationAnalysis);
  const overallAssessment = generateOverallAssessment(
    totalScore, 
    keywordAnalysis, 
    skillsAnalysis, 
    experienceAnalysis, 
    educationAnalysis
  );
  
  return {
    totalScore,
    jobMatch: keywordAnalysis,
    skillsAlignment: skillsAnalysis,
    experienceRelevance: experienceAnalysis,
    educationRequirements: educationAnalysis,
    overallAssessment
  };
}

function extractJobRequirements(jobTitle: string, jobDescription: string): JobRequirements {
  const titleLower = jobTitle.toLowerCase();
  const descriptionLower = jobDescription.toLowerCase();
  
  // Find matching job template
  const template = Object.entries(JOB_TEMPLATES).find(([key]) => 
    titleLower.includes(key) || descriptionLower.includes(key)
  )?.[1] || {};
  
  // Extract keywords from job description
  const keywords = extractKeywords(jobDescription);
  const skills = extractSkills(jobDescription);
  
  // Determine experience requirements
  const yearsExperience = extractYearsExperience(jobDescription) || template.requiredYearsExperience || 2;
  
  // Extract education requirements
  const educationRequirements = extractEducationRequirements(jobDescription) || template.requiredEducation || ['bachelor'];
  
  return {
    title: jobTitle,
    description: jobDescription,
    requiredKeywords: [...new Set([...keywords, ...(template.requiredKeywords || [])])],
    requiredSkills: [...new Set([...skills, ...(template.requiredSkills || [])])],
    requiredYearsExperience: yearsExperience,
    requiredEducation: educationRequirements,
    preferredQualifications: extractPreferredQualifications(jobDescription)
  };
}

function extractKeywords(text: string): string[] {
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  // Filter for action/technical words
  const keywords = words.filter(word => 
    ['develop', 'manage', 'create', 'analyze', 'design', 'implement', 'strategic', 'technical', 'professional'].some(k => word.includes(k)) ||
    word.length > 5
  );
  
  return [...new Set(keywords)].slice(0, 20);
}

function extractSkills(text: string): string[] {
  const skills = [
    'JavaScript', 'Python', 'Java', 'C++', 'React', 'Angular', 'Vue.js', 'Node.js', 'SQL', 'MongoDB',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'HTML', 'CSS', 'TypeScript', 'PHP', 'Ruby',
    'Excel', 'PowerPoint', 'Word', 'Outlook', 'Salesforce', 'HubSpot', 'Google Analytics', 'SEO',
    'Digital Marketing', 'Content Marketing', 'Social Media', 'Email Marketing', 'PPC', 'CRM',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication', 'Problem Solving',
    'Data Analysis', 'Machine Learning', 'Statistics', 'Tableau', 'Power BI', 'R', 'SPSS'
  ];
  
  return skills.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

function extractYearsExperience(text: string): number | null {
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?(?:relevant\s*)?experience/i,
    /minimum\s*(\d+)\s*years?/i,
    /(\d+)\s*years?\s*(?:in\s*)?(?:the\s*)?(?:field|industry)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return null;
}

function extractEducationRequirements(text: string): string[] {
  const educationPatterns = [
    /bachelor['']?s?\s*(?:degree)?\s*(?:in\s*)?([^.]*?)(?:\.|,|$)/i,
    /master['']?s?\s*(?:degree)?\s*(?:in\s*)?([^.]*?)(?:\.|,|$)/i,
    /mba\s*(?:in\s*)?([^.]*?)(?:\.|,|$)/i,
    /phd\s*(?:in\s*)?([^.]*?)(?:\.|,|$)/i
  ];
  
  const requirements: string[] = [];
  
  for (const pattern of educationPatterns) {
    const match = text.match(pattern);
    if (match) {
      requirements.push(match[0].toLowerCase());
    }
  }
  
  return requirements.length > 0 ? requirements : ['bachelor'];
}

function extractPreferredQualifications(text: string): string[] {
  const preferredSection = text.match(/preferred[\s\w]*[:\-]([\s\S]*?)(?:required|$)/i);
  if (preferredSection) {
    return preferredSection[1]
      .split(/[,\n\•]/)
      .map(item => item.trim())
      .filter(item => item.length > 5)
      .slice(0, 10);
  }
  
  return [];
}

function analyzeKeywordMatch(resume: OptimizedResume, job: JobRequirements): {
  score: number;
  keywordsFound: string[];
  keywordsMissing: string[];
  keywordMatchPercentage: number;
} {
  const resumeText = JSON.stringify(resume).toLowerCase();
  const keywordsFound: string[] = [];
  const keywordsMissing: string[] = [];
  
  job.requiredKeywords.forEach(keyword => {
    if (resumeText.includes(keyword.toLowerCase())) {
      keywordsFound.push(keyword);
    } else {
      keywordsMissing.push(keyword);
    }
  });
  
  const keywordMatchPercentage = job.requiredKeywords.length > 0 
    ? Math.round((keywordsFound.length / job.requiredKeywords.length) * 100)
    : 0;
  
  // Score based on keyword match percentage
  let score = 0;
  if (keywordMatchPercentage >= 80) score = 100;
  else if (keywordMatchPercentage >= 60) score = 80;
  else if (keywordMatchPercentage >= 40) score = 60;
  else if (keywordMatchPercentage >= 20) score = 40;
  else score = 20;
  
  return {
    score,
    keywordsFound,
    keywordsMissing,
    keywordMatchPercentage
  };
}

function analyzeSkillsAlignment(resume: OptimizedResume, job: JobRequirements): {
  score: number;
  requiredSkillsFound: string[];
  requiredSkillsMissing: string[];
  skillsMatchPercentage: number;
} {
  const resumeText = JSON.stringify(resume).toLowerCase();
  const skillsFound: string[] = [];
  const skillsMissing: string[] = [];
  
  job.requiredSkills.forEach(skill => {
    if (resumeText.includes(skill.toLowerCase())) {
      skillsFound.push(skill);
    } else {
      skillsMissing.push(skill);
    }
  });
  
  const skillsMatchPercentage = job.requiredSkills.length > 0 
    ? Math.round((skillsFound.length / job.requiredSkills.length) * 100)
    : 0;
  
  // Score based on skills match percentage
  let score = 0;
  if (skillsMatchPercentage >= 80) score = 100;
  else if (skillsMatchPercentage >= 60) score = 85;
  else if (skillsMatchPercentage >= 40) score = 70;
  else if (skillsMatchPercentage >= 20) score = 50;
  else score = 30;
  
  return {
    score,
    requiredSkillsFound: skillsFound,
    requiredSkillsMissing: skillsMissing,
    skillsMatchPercentage
  };
}

function analyzeExperienceRelevance(resume: OptimizedResume, job: JobRequirements): {
  score: number;
  relevantYears: number;
  requiredYears: number;
  experienceMatch: boolean;
  details: string[];
} {
  let totalYears = 0;
  const details: string[] = [];
  
  // Analyze experience section
  resume.experience.forEach(exp => {
    // Extract years from dates (simplified)
    const yearsInRole = extractYearsFromDates(exp.dates);
    totalYears += yearsInRole;
    
    // Check if experience is relevant to job title
    const expText = `${exp.title} ${exp.company} ${exp.bullets.join(' ')}`.toLowerCase();
    const jobTitleKeywords = job.title.toLowerCase().split(/\s+/);
    const isRelevant = jobTitleKeywords.some(keyword => 
      expText.includes(keyword) || keyword.length > 3
    );
    
    if (isRelevant) {
      details.push(`${exp.title} at ${exp.company} (${exp.dates}) - Relevant experience`);
    }
  });
  
  const requiredYears = job.requiredYearsExperience;
  const experienceMatch = totalYears >= requiredYears;
  
  // Calculate score based on experience match
  let score = 0;
  if (totalYears >= requiredYears * 1.5) score = 100;
  else if (totalYears >= requiredYears) score = 90;
  else if (totalYears >= requiredYears * 0.8) score = 70;
  else if (totalYears >= requiredYears * 0.5) score = 50;
  else score = 30;
  
  if (!experienceMatch) {
    details.push(`Requires ${requiredYears} years, found ${totalYears} years`);
  }
  
  return {
    score,
    relevantYears: totalYears,
    requiredYears,
    experienceMatch,
    details
  };
}

function extractYearsFromDates(dateString: string): number {
  // Simplified year extraction - in real implementation would be more sophisticated
  const yearMatches = dateString.match(/\d{4}/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(y => parseInt(y));
    return Math.max(...years) - Math.min(...years);
  }
  
  // Look for "X years" format
  const yearMatch = dateString.match(/(\d+)\s*years?/i);
  if (yearMatch) {
    return parseInt(yearMatch[1]);
  }
  
  return 1; // Default to 1 year if can't extract
}

function analyzeEducationRequirements(resume: OptimizedResume, job: JobRequirements): {
  score: number;
  requiredEducationFound: boolean;
  educationLevel: string;
  details: string[];
} {
  const educationText = JSON.stringify(resume.education).toLowerCase();
  const details: string[] = [];
  
  let educationFound = false;
  let educationLevel = 'Unknown';
  
  // Check for required education levels
  for (const requirement of job.requiredEducation) {
    if (educationText.includes(requirement.toLowerCase())) {
      educationFound = true;
      educationLevel = requirement;
      details.push(`Found required education: ${requirement}`);
      break;
    }
  }
  
  // Check for higher education levels
  if (!educationFound) {
    if (educationText.includes('master') || educationText.includes('mba')) {
      educationLevel = 'Master\'s Degree';
      educationFound = true;
      details.push('Found advanced education: Master\'s Degree');
    } else if (educationText.includes('bachelor') || educationText.includes('ba') || educationText.includes('bs')) {
      educationLevel = 'Bachelor\'s Degree';
      educationFound = true;
      details.push('Found required education: Bachelor\'s Degree');
    }
  }
  
  // Calculate score
  let score = 0;
  if (educationFound) {
    score = job.requiredEducation.some(req => educationLevel.toLowerCase().includes(req.toLowerCase())) ? 100 : 80;
  } else {
    score = 20;
    details.push('Education requirements not met');
  }
  
  return {
    score,
    requiredEducationFound: educationFound,
    educationLevel,
    details
  };
}

function calculateJobSpecificScore(
  keywordAnalysis: any,
  skillsAnalysis: any,
  experienceAnalysis: any,
  educationAnalysis: any
): number {
  const weights = {
    keywords: 0.35,
    skills: 0.30,
    experience: 0.25,
    education: 0.10
  };
  
  const weightedScore = 
    (keywordAnalysis.score * weights.keywords) +
    (skillsAnalysis.score * weights.skills) +
    (experienceAnalysis.score * weights.experience) +
    (educationAnalysis.score * weights.education);
  
  return Math.round(weightedScore);
}

function generateOverallAssessment(
  totalScore: number,
  keywordAnalysis: any,
  skillsAnalysis: any,
  experienceAnalysis: any,
  educationAnalysis: any
): {
  matchLevel: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  keyStrengths: string[];
  improvementAreas: string[];
  nextSteps: string[];
} {
  let matchLevel: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  
  if (totalScore >= 85) matchLevel = 'Excellent';
  else if (totalScore >= 70) matchLevel = 'Good';
  else if (totalScore >= 50) matchLevel = 'Fair';
  else matchLevel = 'Poor';
  
  const keyStrengths: string[] = [];
  const improvementAreas: string[] = [];
  const nextSteps: string[] = [];
  
  // Identify strengths
  if (keywordAnalysis.keywordMatchPercentage >= 70) {
    keyStrengths.push('Strong keyword alignment with job description');
  }
  if (skillsAnalysis.skillsMatchPercentage >= 70) {
    keyStrengths.push('Good skills match for the position');
  }
  if (experienceAnalysis.experienceMatch) {
    keyStrengths.push('Meets experience requirements');
  }
  if (educationAnalysis.requiredEducationFound) {
    keyStrengths.push('Meets education requirements');
  }
  
  // Identify improvement areas
  if (keywordAnalysis.keywordMatchPercentage < 50) {
    improvementAreas.push('Add more relevant keywords from the job description');
  }
  if (skillsAnalysis.skillsMatchPercentage < 50) {
    improvementAreas.push('Highlight more required technical skills');
  }
  if (!experienceAnalysis.experienceMatch) {
    improvementAreas.push('Emphasize relevant experience more clearly');
  }
  if (!educationAnalysis.requiredEducationFound) {
    improvementAreas.push('Ensure education requirements are clearly stated');
  }
  
  // Generate next steps
  nextSteps.push('Tailor your resume to include more job-specific keywords');
  nextSteps.push('Quantify your achievements and impact in previous roles');
  nextSteps.push('Use action verbs that match the job description');
  
  if (skillsAnalysis.requiredSkillsMissing.length > 0) {
    nextSteps.push(`Consider highlighting experience with: ${skillsAnalysis.requiredSkillsMissing.slice(0, 3).join(', ')}`);
  }
  
  return {
    matchLevel,
    keyStrengths: keyStrengths.length > 0 ? keyStrengths : ['Basic qualifications met'],
    improvementAreas: improvementAreas.length > 0 ? improvementAreas : ['Resume could be more targeted to this specific role'],
    nextSteps
  };
}