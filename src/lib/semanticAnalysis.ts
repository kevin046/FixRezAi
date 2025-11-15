export interface SemanticMatch {
  score: number;
  matchedTerms: string[];
  similarTerms: string[];
  contextMatches: string[];
}

export interface NLPAnalysis {
  semanticSimilarity: SemanticMatch;
  keywordDensity: { [keyword: string]: number };
  importantPhrases: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  readability: number;
}

// Semantic similarity mappings
const SEMANTIC_MAPPINGS: { [key: string]: string[] } = {
  // Programming Languages
  'javascript': ['js', 'ecmascript', 'node.js', 'react', 'vue', 'angular'],
  'python': ['py', 'django', 'flask', 'pandas', 'numpy'],
  'java': ['spring', 'spring boot', 'maven', 'gradle'],
  'csharp': ['c#', '.net', 'asp.net', 'visual studio'],
  'cpp': ['c++', 'object-oriented programming', 'oop'],
  
  // Web Technologies
  'frontend': ['ui', 'user interface', 'client-side', 'web development'],
  'backend': ['server-side', 'api', 'database', 'server'],
  'fullstack': ['full stack', 'frontend', 'backend', 'end-to-end'],
  'react': ['react.js', 'jsx', 'hooks', 'components'],
  'vue': ['vue.js', 'nuxt.js', 'components'],
  'angular': ['angular.js', 'typescript', 'spa'],
  
  // Databases
  'mysql': ['sql', 'relational database', 'rdbms'],
  'postgresql': ['postgres', 'sql', 'relational database'],
  'mongodb': ['mongo', 'nosql', 'document database'],
  'redis': ['cache', 'in-memory', 'key-value'],
  
  // Cloud & DevOps
  'aws': ['amazon web services', 'ec2', 's3', 'lambda'],
  'azure': ['microsoft azure', 'cloud services'],
  'gcp': ['google cloud platform', 'google cloud'],
  'docker': ['containerization', 'containers'],
  'kubernetes': ['k8s', 'orchestration', 'containers'],
  'ci/cd': ['continuous integration', 'continuous deployment', 'devops'],
  
  // Soft Skills
  'leadership': ['management', 'team lead', 'supervision', 'mentoring'],
  'communication': ['presentation', 'writing', 'interpersonal', 'collaboration'],
  'problem solving': ['analytical', 'critical thinking', 'troubleshooting'],
  'teamwork': ['collaboration', 'team player', 'cross-functional'],
  
  // Business Terms
  'agile': ['scrum', 'kanban', 'iterative', 'sprint'],
  'project management': ['pm', 'planning', 'coordination', 'timeline'],
  'business analysis': ['ba', 'requirements', 'stakeholder'],
  'customer service': ['client service', 'support', 'customer success']
};

// Common synonyms for job requirements
const SYNONYM_DATABASE: { [key: string]: string[] } = {
  'senior': ['sr', 'lead', 'principal', 'staff'],
  'junior': ['jr', 'entry-level', 'associate', 'trainee'],
  'experienced': ['seasoned', 'skilled', 'proficient', 'expert'],
  'required': ['must have', 'essential', 'mandatory', 'necessary'],
  'preferred': ['nice to have', 'desirable', 'optional', 'bonus'],
  'excellent': ['strong', 'outstanding', 'exceptional', 'superior']
};

// Technical skill categories
const SKILL_CATEGORIES: { [category: string]: string[] } = {
  'programming': ['javascript', 'python', 'java', 'csharp', 'cpp', 'ruby', 'php', 'swift', 'kotlin'],
  'web_frameworks': ['react', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'rails'],
  'databases': ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle'],
  'cloud_platforms': ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
  'tools': ['git', 'jenkins', 'jira', 'docker', 'kubernetes'],
  'soft_skills': ['leadership', 'communication', 'teamwork', 'problem solving']
};

export function calculateSemanticSimilarity(text1: string, text2: string): SemanticMatch {
  const tokens1 = tokenizeAndNormalize(text1);
  const tokens2 = tokenizeAndNormalize(text2);
  
  const exactMatches: string[] = [];
  const similarTerms: string[] = [];
  const contextMatches: string[] = [];
  
  // Find exact matches
  tokens1.forEach(token1 => {
    if (tokens2.includes(token1)) {
      exactMatches.push(token1);
    }
  });
  
  // Find semantic similarities
  tokens1.forEach(token1 => {
    tokens2.forEach(token2 => {
      if (token1 !== token2 && areSemanticallySimilar(token1, token2)) {
        similarTerms.push(`${token1}~${token2}`);
      }
    });
  });
  
  // Find context matches (related concepts)
  tokens1.forEach(token1 => {
    tokens2.forEach(token2 => {
      if (areContextuallyRelated(token1, token2)) {
        contextMatches.push(`${token1}→${token2}`);
      }
    });
  });
  
  // Calculate similarity score
  const totalUniqueTokens = new Set([...tokens1, ...tokens2]).size;
  const matchScore = (exactMatches.length + similarTerms.length * 0.7 + contextMatches.length * 0.3) / totalUniqueTokens;
  const finalScore = Math.min(1, matchScore);
  
  return {
    score: Math.round(finalScore * 100) / 100,
    matchedTerms: [...new Set(exactMatches)],
    similarTerms: [...new Set(similarTerms)],
    contextMatches: [...new Set(contextMatches)]
  };
}

export function analyzeJobDescription(jobDescription: string): NLPAnalysis {
  const tokens = tokenizeAndNormalize(jobDescription);
  const sentences = jobDescription.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Calculate keyword density
  const keywordDensity = calculateKeywordDensity(tokens);
  
  // Extract important phrases
  const importantPhrases = extractImportantPhrases(jobDescription);
  
  // Analyze sentiment
  const sentiment = analyzeSentiment(tokens);
  
  // Calculate readability
  const readability = calculateReadability(jobDescription);
  
  // Calculate semantic similarity with common job terms
  const commonJobTerms = ['experience', 'skills', 'requirements', 'responsibilities', 'qualifications'];
  const semanticSimilarity = calculateSemanticSimilarity(jobDescription, commonJobTerms.join(' '));
  
  return {
    semanticSimilarity,
    keywordDensity,
    importantPhrases,
    sentiment,
    readability
  };
}

export function matchResumeToJob(resumeText: string, jobDescription: string): {
  overallMatch: number;
  skillMatches: SemanticMatch;
  experienceMatches: SemanticMatch;
  educationMatches: SemanticMatch;
  keywordMatches: SemanticMatch;
  missingKeywords: string[];
  suggestions: string[];
} {
  const resumeTokens = tokenizeAndNormalize(resumeText);
  const jobTokens = tokenizeAndNormalize(jobDescription);
  
  // Extract different sections
  const resumeSkills = extractSkillsFromText(resumeText);
  const jobSkills = extractSkillsFromText(jobDescription);
  
  const resumeExperience = extractExperienceFromText(resumeText);
  const jobExperience = extractExperienceFromText(jobDescription);
  
  const resumeEducation = extractEducationFromText(resumeText);
  const jobEducation = extractEducationFromText(jobDescription);
  
  // Calculate matches for each category
  const skillMatches = calculateMultiSemanticSimilarity(resumeSkills, jobSkills);
  const experienceMatches = calculateSemanticSimilarity(resumeExperience, jobExperience);
  const educationMatches = calculateSemanticSimilarity(resumeEducation, jobEducation);
  const keywordMatches = calculateSemanticSimilarity(resumeText, jobDescription);
  
  // Find missing keywords
  const missingKeywords = findMissingKeywords(resumeTokens, jobTokens);
  
  // Calculate overall match score (weighted average)
  const overallMatch = (
    skillMatches.score * 0.4 +
    experienceMatches.score * 0.3 +
    educationMatches.score * 0.2 +
    keywordMatches.score * 0.1
  );
  
  // Generate suggestions
  const suggestions = generateSuggestions(resumeTokens, jobTokens, missingKeywords);
  
  return {
    overallMatch: Math.round(overallMatch * 100) / 100,
    skillMatches,
    experienceMatches,
    educationMatches,
    keywordMatches,
    missingKeywords,
    suggestions
  };
}

// Helper functions
function tokenizeAndNormalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
    .map(token => normalizeToken(token))
    .filter(token => token.length > 0);
}

function normalizeToken(token: string): string {
  // Remove common suffixes and normalize
  const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'ness', 'ment'];
  let normalized = token;
  
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 2) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }
  
  return normalized;
}

function areSemanticallySimilar(token1: string, token2: string): boolean {
  // Check direct semantic mappings
  const mappings = Object.values(SEMANTIC_MAPPINGS);
  for (const mapping of mappings) {
    if (mapping.includes(token1) && mapping.includes(token2)) {
      return true;
    }
  }
  
  // Check if they're in the same category
  const categories = Object.values(SKILL_CATEGORIES);
  for (const category of categories) {
    if (category.includes(token1) && category.includes(token2)) {
      return true;
    }
  }
  
  // Check synonym database
  const synonyms = Object.values(SYNONYM_DATABASE);
  for (const synonymGroup of synonyms) {
    if (synonymGroup.includes(token1) && synonymGroup.includes(token2)) {
      return true;
    }
  }
  
  // Check for common prefixes/suffixes
  if (token1.startsWith(token2) || token2.startsWith(token1)) {
    return token1.length > 4 || token2.length > 4;
  }
  
  return false;
}

function areContextuallyRelated(token1: string, token2: string): boolean {
  // Check if tokens are often used together in job descriptions
  const relatedPairs = [
    ['frontend', 'backend'], ['ui', 'ux'], ['agile', 'scrum'],
    ['leadership', 'management'], ['communication', 'collaboration'],
    ['database', 'sql'], ['api', 'rest'], ['cloud', 'aws']
  ];
  
  return relatedPairs.some(pair => 
    (pair.includes(token1) && pair.includes(token2))
  );
}

function calculateKeywordDensity(tokens: string[]): { [keyword: string]: number } {
  const density: { [keyword: string]: number } = {};
  const totalTokens = tokens.length;
  
  const keywordCounts = tokens.reduce((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  
  Object.entries(keywordCounts).forEach(([keyword, count]) => {
    density[keyword] = count / totalTokens;
  });
  
  return density;
}

function extractImportantPhrases(text: string): string[] {
  const phrases: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach(sentence => {
    // Extract noun phrases (simplified)
    const words = sentence.trim().split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = words.slice(i, i + 3).join(' '); // 2-3 word phrases
      if (phrase.length > 10 && phrase.length < 50) {
        phrases.push(phrase);
      }
    }
  });
  
  // Filter and rank phrases by importance
  return phrases
    .filter(phrase => {
      const words = phrase.toLowerCase().split(/\s+/);
      return words.some(word => 
        Object.keys(SEMANTIC_MAPPINGS).includes(word) ||
        Object.values(SKILL_CATEGORIES).flat().includes(word)
      );
    })
    .slice(0, 10); // Top 10 important phrases
}

function analyzeSentiment(tokens: string[]): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['excellent', 'outstanding', 'strong', 'proficient', 'skilled', 'experienced', 'expert', 'advanced'];
  const negativeWords = ['basic', 'limited', 'minimal', 'no experience', 'not required'];
  
  const positiveCount = tokens.filter(token => positiveWords.includes(token)).length;
  const negativeCount = tokens.filter(token => negativeWords.includes(token)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function calculateReadability(text: string): number {
  // Simple readability score based on sentence and word length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  
  const avgSentenceLength = words.length / sentences.length;
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Score from 0-100 (higher is more readable)
  const readability = Math.max(0, 100 - (avgSentenceLength * 1.5) - (avgWordLength * 10));
  
  return Math.round(readability * 10) / 10;
}

function calculateMultiSemanticSimilarity(list1: string[], list2: string[]): SemanticMatch {
  let totalScore = 0;
  let totalMatches = 0;
  const allMatchedTerms: string[] = [];
  const allSimilarTerms: string[] = [];
  const allContextMatches: string[] = [];
  
  list1.forEach(item1 => {
    let bestMatch: SemanticMatch = { score: 0, matchedTerms: [], similarTerms: [], contextMatches: [] };
    
    list2.forEach(item2 => {
      const similarity = calculateSemanticSimilarity(item1, item2);
      if (similarity.score > bestMatch.score) {
        bestMatch = similarity;
      }
    });
    
    if (bestMatch.score > 0) {
      totalScore += bestMatch.score;
      totalMatches++;
      allMatchedTerms.push(...bestMatch.matchedTerms);
      allSimilarTerms.push(...bestMatch.similarTerms);
      allContextMatches.push(...bestMatch.contextMatches);
    }
  });
  
  const averageScore = totalMatches > 0 ? totalScore / totalMatches : 0;
  
  return {
    score: Math.round(averageScore * 100) / 100,
    matchedTerms: [...new Set(allMatchedTerms)],
    similarTerms: [...new Set(allSimilarTerms)],
    contextMatches: [...new Set(allContextMatches)]
  };
}

function extractSkillsFromText(text: string): string[] {
  const tokens = tokenizeAndNormalize(text);
  const skills: string[] = [];
  
  // Check against known skills
  Object.keys(SEMANTIC_MAPPINGS).forEach(skill => {
    if (tokens.includes(skill)) {
      skills.push(skill);
    }
  });
  
  // Check skill categories
  Object.values(SKILL_CATEGORIES).flat().forEach(skill => {
    if (tokens.includes(skill) && !skills.includes(skill)) {
      skills.push(skill);
    }
  });
  
  return [...new Set(skills)];
}

function extractExperienceFromText(text: string): string {
  // Extract experience-related content
  const experienceKeywords = ['experience', 'worked', 'developed', 'created', 'managed', 'led', 'built'];
  const tokens = tokenizeAndNormalize(text);
  
  return tokens
    .filter(token => experienceKeywords.some(keyword => token.includes(keyword)))
    .join(' ');
}

function extractEducationFromText(text: string): string {
  // Extract education-related content
  const educationKeywords = ['education', 'degree', 'university', 'college', 'graduated'];
  const tokens = tokenizeAndNormalize(text);
  
  return tokens
    .filter(token => educationKeywords.some(keyword => token.includes(keyword)))
    .join(' ');
}

function findMissingKeywords(resumeTokens: string[], jobTokens: string[]): string[] {
  const missing: string[] = [];
  
  jobTokens.forEach(jobToken => {
    if (!resumeTokens.includes(jobToken)) {
      // Check if it's an important keyword (appears multiple times in job description)
      const jobTokenCount = jobTokens.filter(token => token === jobToken).length;
      if (jobTokenCount > 1) {
        missing.push(jobToken);
      }
    }
  });
  
  return [...new Set(missing)];
}

function generateSuggestions(resumeTokens: string[], jobTokens: string[], missingKeywords: string[]): string[] {
  const suggestions: string[] = [];
  
  if (missingKeywords.length > 0) {
    suggestions.push(`Consider adding these keywords to your resume: ${missingKeywords.slice(0, 5).join(', ')}`);
  }
  
  // Check for missing soft skills
  const softSkills = ['leadership', 'communication', 'teamwork', 'problem solving'];
  const hasSoftSkills = resumeTokens.some(token => softSkills.includes(token));
  if (!hasSoftSkills) {
    suggestions.push('Consider highlighting your soft skills like leadership and communication.');
  }
  
  // Check for quantifiable achievements
  const hasNumbers = resumeTokens.some(token => /\d/.test(token));
  if (!hasNumbers) {
    suggestions.push('Add quantifiable achievements (e.g., "increased sales by 25%").');
  }
  
  return suggestions;
}