import { OptimizedResume } from '@/types/resume';

export interface ATSScore {
  totalScore: number;
  categories: {
    parseRate: {
      score: number;
      details: string[];
    };
    quantifyingImpact: {
      score: number;
      details: string[];
    };
    repetition: {
      score: number;
      details: string[];
    };
    spellingGrammar: {
      score: number;
      details: string[];
    };
  };
  feedback: string[];
  colorCode: 'red' | 'yellow' | 'lightgreen' | 'green';
}

// Action verbs for impact assessment
const ACTION_VERBS = [
  'achieved', 'accomplished', 'administered', 'analyzed', 'arranged', 'assembled', 'assessed', 'assigned',
  'attained', 'authorized', 'boosted', 'built', 'calculated', 'chaired', 'changed', 'collaborated',
  'completed', 'composed', 'conceived', 'conducted', 'consolidated', 'constructed', 'consulted',
  'controlled', 'coordinated', 'created', 'decreased', 'defined', 'delivered', 'demonstrated',
  'designed', 'developed', 'devised', 'directed', 'discovered', 'doubled', 'eliminated', 'enhanced',
  'established', 'evaluated', 'executed', 'expanded', 'expedited', 'fabricated', 'facilitated',
  'finalized', 'formed', 'formulated', 'founded', 'generated', 'guided', 'headed', 'identified',
  'implemented', 'improved', 'increased', 'influenced', 'initiated', 'innovated', 'inspected',
  'installed', 'instituted', 'introduced', 'invented', 'launched', 'led', 'managed', 'maximized',
  'minimized', 'modified', 'motivated', 'negotiated', 'operated', 'optimized', 'organized',
  'originated', 'overhauled', 'oversaw', 'performed', 'planned', 'prepared', 'presented',
  'produced', 'programmed', 'promoted', 'proposed', 'provided', 'published', 'purchased',
  'raised', 'realized', 'recommended', 'redesigned', 'reduced', 'reorganized', 'replaced',
  'researched', 'resolved', 'restored', 'restructured', 'revamped', 'reviewed', 'revised',
  'saved', 'scheduled', 'secured', 'selected', 'simplified', 'solved', 'spearheaded', 'strengthened',
  'streamlined', 'structured', 'supervised', 'supported', 'surpassed', 'trained', 'transformed',
  'tripled', 'upgraded', 'utilized', 'validated', 'widened', 'won'
];

// Common soft skills that might indicate repetition
const SOFT_SKILLS = [
  'team player', 'excellent communication', 'hardworking', 'dedicated', 'motivated',
  'detail-oriented', 'organized', 'reliable', 'responsible', 'creative', 'innovative',
  'leadership', 'problem-solving', 'analytical', 'strategic', 'results-driven'
];

// Common spelling errors in resumes
const COMMON_ERRORS = [
  { wrong: 'recieved', correct: 'received' },
  { wrong: 'seperate', correct: 'separate' },
  { wrong: 'definately', correct: 'definitely' },
  { wrong: 'occured', correct: 'occurred' },
  { wrong: 'begining', correct: 'beginning' },
  { wrong: 'existance', correct: 'existence' },
  { wrong: 'maintainance', correct: 'maintenance' },
  { wrong: 'neccessary', correct: 'necessary' },
  { wrong: 'priviledge', correct: 'privilege' },
  { wrong: 'supercede', correct: 'supersede' }
];

export function calculateATSScore(resume: OptimizedResume): ATSScore {
  const parseRateScore = calculateParseRateScore(resume);
  const quantifyingImpactScore = calculateQuantifyingImpactScore(resume);
  const repetitionScore = calculateRepetitionScore(resume);
  const spellingGrammarScore = calculateSpellingGrammarScore(resume);

  const totalScore = Math.round(
    (parseRateScore.score * 0.25) +
    (quantifyingImpactScore.score * 0.25) +
    (repetitionScore.score * 0.25) +
    (spellingGrammarScore.score * 0.25)
  );

  const colorCode = getColorCode(totalScore);
  const feedback = generateFeedback(totalScore, {
    parseRate: parseRateScore,
    quantifyingImpact: quantifyingImpactScore,
    repetition: repetitionScore,
    spellingGrammar: spellingGrammarScore
  });

  return {
    totalScore,
    categories: {
      parseRate: parseRateScore,
      quantifyingImpact: quantifyingImpactScore,
      repetition: repetitionScore,
      spellingGrammar: spellingGrammarScore
    },
    feedback,
    colorCode
  };
}

function calculateParseRateScore(resume: OptimizedResume): { score: number; details: string[] } {
  let score = 100;
  const details: string[] = [];

  // Check contact information
  if (!resume.header.contact || resume.header.contact.trim().length < 10) {
    score -= 25;
    details.push('Missing or incomplete contact information');
  }

  // Check for email address
  const contactLower = resume.header.contact.toLowerCase();
  if (!contactLower.includes('@') || !contactLower.includes('.')) {
    score -= 20;
    details.push('Email address not found in contact information');
  }

  // Check for proper section structure
  const hasSummary = resume.summary && resume.summary.trim().length > 0;
  const hasExperience = resume.experience && resume.experience.length > 0;
  const hasEducation = resume.education && resume.education.length > 0;

  if (!hasSummary) {
    score -= 15;
    details.push('Missing professional summary section');
  }

  if (!hasExperience) {
    score -= 20;
    details.push('Missing work experience section');
  }

  if (!hasEducation) {
    score -= 10;
    details.push('Missing education section');
  }

  // Check for proper formatting indicators
  const totalText = JSON.stringify(resume).toLowerCase();
  if (totalText.includes('•') || totalText.includes('-')) {
    score += 5; // Bonus for bullet points
    details.push('Good use of bullet points for readability');
  }

  return { score: Math.max(0, score), details };
}

function calculateQuantifyingImpactScore(resume: OptimizedResume): { score: number; details: string[] } {
  let score = 50; // Base score
  const details: string[] = [];
  let actionVerbCount = 0;
  let quantificationCount = 0;
  let totalBullets = 0;

  // Analyze experience bullets
  resume.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      totalBullets++;
      const bulletLower = bullet.toLowerCase();
      
      // Count action verbs
      ACTION_VERBS.forEach(verb => {
        if (bulletLower.includes(verb)) {
          actionVerbCount++;
        }
      });

      // Count quantifications (numbers, percentages, dollar amounts)
      if (bullet.match(/\d+/) || bullet.includes('%') || bullet.includes('$')) {
        quantificationCount++;
      }
    });
  });

  // Score based on action verb usage
  const actionVerbRatio = totalBullets > 0 ? actionVerbCount / totalBullets : 0;
  if (actionVerbRatio >= 0.8) {
    score += 25;
    details.push('Excellent use of action verbs');
  } else if (actionVerbRatio >= 0.6) {
    score += 15;
    details.push('Good use of action verbs');
  } else if (actionVerbRatio >= 0.4) {
    score += 10;
    details.push('Moderate use of action verbs');
  } else {
    details.push('Needs more action verbs to demonstrate impact');
  }

  // Score based on quantification
  const quantificationRatio = totalBullets > 0 ? quantificationCount / totalBullets : 0;
  if (quantificationRatio >= 0.6) {
    score += 25;
    details.push('Strong quantification of achievements');
  } else if (quantificationRatio >= 0.4) {
    score += 15;
    details.push('Good quantification of achievements');
  } else if (quantificationRatio >= 0.2) {
    score += 10;
    details.push('Some quantification present');
  } else {
    details.push('Add specific numbers and metrics to demonstrate impact');
  }

  return { score: Math.min(100, score), details };
}

function calculateRepetitionScore(resume: OptimizedResume): { score: number; details: string[] } {
  let score = 100;
  const details: string[] = [];
  const wordFrequency: { [key: string]: number } = {};
  let softSkillCount = 0;

  // Combine all text content
  const allText = [
    resume.summary,
    ...resume.experience.map(exp => `${exp.title} ${exp.company} ${exp.bullets.join(' ')}`),
    ...resume.education.map(edu => `${edu.school} ${edu.degree}`),
    resume.additional.technical_skills || '',
    resume.additional.languages || '',
    resume.additional.certifications || '',
    resume.additional.awards || ''
  ].join(' ').toLowerCase();

  // Count word frequency
  const words = allText.replace(/[^\w\s]/g, '').split(/\s+/);
  words.forEach(word => {
    if (word.length > 3) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });

  // Check for repetitive words
  const repetitiveWords = Object.entries(wordFrequency)
    .filter(([_, count]) => count > 5)
    .sort(([, a], [, b]) => b - a);

  if (repetitiveWords.length > 0) {
    const topRepetitive = repetitiveWords.slice(0, 3);
    score -= (topRepetitive.length * 10);
    details.push(`Repetitive words found: ${topRepetitive.map(([word]) => word).join(', ')}`);
  }

  // Check for soft skills repetition
  SOFT_SKILLS.forEach(skill => {
    if (allText.includes(skill)) {
      softSkillCount++;
    }
  });

  if (softSkillCount > 3) {
    score -= 15;
    details.push('Too many generic soft skills - focus on specific achievements');
  }

  // Check for title relevance (simplified check)
  const titleWords = resume.header.name.toLowerCase().split(/\s+/);
  const hasProfessionalTitle = titleWords.some(word => 
    ['engineer', 'manager', 'developer', 'analyst', 'director', 'specialist'].includes(word)
  );

  if (!hasProfessionalTitle) {
    score -= 10;
    details.push('Consider adding a professional title to your header');
  }

  return { score: Math.max(0, score), details };
}

function calculateSpellingGrammarScore(resume: OptimizedResume): { score: number; details: string[] } {
  let score = 100;
  const details: string[] = [];
  const allText = [
    resume.summary,
    ...resume.experience.map(exp => `${exp.title} ${exp.company} ${exp.bullets.join(' ')}`),
    ...resume.education.map(edu => `${edu.school} ${edu.degree}`),
    resume.additional.technical_skills || '',
    resume.additional.languages || '',
    resume.additional.certifications || '',
    resume.additional.awards || ''
  ].join(' ');

  // Check for common spelling errors
  COMMON_ERRORS.forEach(({ wrong, correct }) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    const matches = allText.match(regex);
    if (matches) {
      score -= (matches.length * 5);
      details.push(`Spelling error: "${wrong}" should be "${correct}"`);
    }
  });

  // Check for professional language
  const unprofessionalWords = ['awesome', 'cool', 'amazing', 'great', 'nice', 'good'];
  unprofessionalWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = allText.match(regex);
    if (matches) {
      score -= (matches.length * 3);
      details.push(`Consider more professional alternatives to "${word}"`);
    }
  });

  // Check for consistent tense usage
  const pastTenseWords = allText.match(/\\b(ed|d)\\b/gi) || [];
  const presentTenseWords = allText.match(/\\b(ing|s)\\b/gi) || [];
  
  if (pastTenseWords.length > 0 && presentTenseWords.length > 0) {
    const ratio = presentTenseWords.length / (pastTenseWords.length + presentTenseWords.length);
    if (ratio > 0.3 && ratio < 0.7) {
      score -= 10;
      details.push('Inconsistent verb tense usage - use past tense for previous roles');
    }
  }

  return { score: Math.max(0, score), details };
}

function getColorCode(score: number): 'red' | 'yellow' | 'lightgreen' | 'green' {
  if (score <= 50) return 'red';
  if (score <= 75) return 'yellow';
  if (score <= 90) return 'lightgreen';
  return 'green';
}

function generateFeedback(totalScore: number, categories: any): string[] {
  const feedback: string[] = [];

  if (totalScore >= 91) {
    feedback.push('Excellent ATS optimization! Your resume is well-positioned for applicant tracking systems.');
  } else if (totalScore >= 76) {
    feedback.push('Good ATS optimization with room for minor improvements.');
  } else if (totalScore >= 51) {
    feedback.push('Fair ATS optimization. Consider addressing the identified issues.');
  } else {
    feedback.push('Poor ATS optimization. Significant improvements needed to pass ATS screening.');
  }

  // Add specific improvement suggestions
  if (categories.parseRate.score < 80) {
    feedback.push('Ensure all required sections are present and properly formatted.');
  }

  if (categories.quantifyingImpact.score < 80) {
    feedback.push('Add more specific metrics and achievements with action verbs.');
  }

  if (categories.repetition.score < 80) {
    feedback.push('Reduce repetitive language and focus on unique accomplishments.');
  }

  if (categories.spellingGrammar.score < 80) {
    feedback.push('Review for spelling errors and use consistent professional language.');
  }

  return feedback;
}