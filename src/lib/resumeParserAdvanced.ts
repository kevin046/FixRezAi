import { parseFile } from './fileParser';

export interface ParsedResume {
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  contactInfo: ContactInfo;
  summary: string;
  rawText: string;
}

export interface WorkExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  duration: number; // in months
  description: string;
  responsibilities: string[];
  achievements: string[];
}

export interface Education {
  degree: string;
  institution: string;
  location: string;
  dates: string;
  gpa?: number;
  honors?: string[];
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  website?: string;
}

// Common skills database for better parsing
const TECHNICAL_SKILLS = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP',
  'Swift', 'Kotlin', 'Objective-C', 'Scala', 'R', 'MATLAB', 'Perl', 'Lua', 'Dart', 'Elixir',
  
  // Web Technologies
  'HTML', 'CSS', 'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Express.js',
  'Node.js', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET',
  
  // Databases
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL Server', 'Cassandra',
  'DynamoDB', 'Elasticsearch', 'InfluxDB', 'Neo4j', 'Firebase', 'Supabase',
  
  // Cloud & DevOps
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions',
  'Terraform', 'Ansible', 'Vagrant', 'Prometheus', 'Grafana', 'Nginx', 'Apache',
  
  // Data Science & AI
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn',
  'Jupyter', 'RStudio', 'Tableau', 'Power BI', 'Hadoop', 'Spark', 'Kafka',
  
  // Tools & Platforms
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Slack', 'Microsoft Teams',
  'Figma', 'Sketch', 'Adobe Creative Suite', 'VS Code', 'IntelliJ', 'PyCharm',
  
  // Soft Skills
  'Leadership', 'Communication', 'Team Management', 'Project Management', 'Problem Solving',
  'Critical Thinking', 'Time Management', 'Adaptability', 'Collaboration', 'Creativity'
];

const COMMON_JOB_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer', 'Frontend Developer',
  'Backend Developer', 'DevOps Engineer', 'Data Scientist', 'Data Engineer', 'Product Manager',
  'Project Manager', 'UX Designer', 'UI Designer', 'Business Analyst', 'QA Engineer',
  'System Administrator', 'Network Engineer', 'Security Engineer', 'Mobile Developer'
];

const EDUCATION_KEYWORDS = [
  'Bachelor', 'Master', 'PhD', 'Doctorate', 'Associate', 'Diploma', 'Certificate',
  'BS', 'BA', 'MS', 'MA', 'MBA', 'MSc', 'BSc', 'BEng', 'MEng'
];

const UNIVERSITY_KEYWORDS = [
  'University', 'College', 'Institute', 'School', 'Academy', 'Polytechnic',
  'State University', 'Technical University', 'Community College'
];

export async function parseResumeAdvanced(file: File): Promise<ParsedResume> {
  try {
    // Parse the file content
    const rawText = await parseFile(file);
    
    // Extract different sections
    const contactInfo = extractContactInfo(rawText);
    const skills = extractSkills(rawText);
    const experience = extractExperience(rawText);
    const education = extractEducation(rawText);
    const summary = extractSummary(rawText);
    
    return {
      skills,
      experience,
      education,
      contactInfo,
      summary,
      rawText
    };
  } catch (error) {
    throw new Error(`Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractContactInfo(text: string): ContactInfo {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const contactInfo: ContactInfo = {
    name: '',
    email: '',
    phone: '',
    location: ''
  };
  
  // Extract name (usually first non-empty line)
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Check if it's a name (not an email, phone, or location)
    if (!isEmail(firstLine) && !isPhoneNumber(firstLine) && !isLocation(firstLine)) {
      contactInfo.name = firstLine;
    }
  }
  
  // Extract email
  const emailMatch = text.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/i);
  if (emailMatch) {
    contactInfo.email = emailMatch[0];
  }
  
  // Extract phone number
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
  if (phoneMatch) {
    contactInfo.phone = phoneMatch[0];
  }
  
  // Extract location (city, state or city, country)
  const locationMatch = text.match(/([A-Za-z\s]+,\s*[A-Za-z\s]{2,}(?:\s[A-Za-z]+)?)|([A-Za-z\s]+,\s*[A-Z]{2}(?:\s\d{5})?)/);
  if (locationMatch) {
    contactInfo.location = locationMatch[0];
  }
  
  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) {
    contactInfo.linkedin = linkedinMatch[0];
  }
  
  // Extract website
  const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w-]+(?:\.[\w-]+)*/i);
  if (websiteMatch && !websiteMatch[0].includes('linkedin')) {
    contactInfo.website = websiteMatch[0];
  }
  
  return contactInfo;
}

function extractSkills(text: string): string[] {
  const skills: string[] = [];
  const textLower = text.toLowerCase();
  
  // Look for skills section
  const skillsSectionMatch = text.match(/(?:skills?|technologies?|tools?|competencies?)[\s\-:]*\n([\s\S]*?)(?:\n\n|\n[A-Z][A-Za-z\s]*[:\-]|$)/i);
  
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[1];
    
    // Split by common delimiters
    const skillItems = skillsText.split(/[,;•\-\n]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 1 && skill.length < 50);
    
    // Match against known skills
    skillItems.forEach(item => {
      TECHNICAL_SKILLS.forEach(knownSkill => {
        if (item.toLowerCase().includes(knownSkill.toLowerCase()) && !skills.includes(knownSkill)) {
          skills.push(knownSkill);
        }
      });
    });
    
    // Add items that look like skills (contain technical terms)
    skillItems.forEach(item => {
      if (looksLikeSkill(item) && !skills.some(skill => skill.toLowerCase() === item.toLowerCase())) {
        skills.push(item);
      }
    });
  }
  
  // Also scan the entire document for skills
  TECHNICAL_SKILLS.forEach(skill => {
    if (textLower.includes(skill.toLowerCase()) && !skills.includes(skill)) {
      // Make sure it's not part of a larger word
      const skillRegex = new RegExp(`\\b${skill}\\b`, 'i');
      if (skillRegex.test(text)) {
        skills.push(skill);
      }
    }
  });
  
  return skills.slice(0, 30); // Limit to top 30 skills
}

function extractExperience(text: string): WorkExperience[] {
  const experience: WorkExperience[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Look for experience/work history section
  const expSectionMatch = text.match(/(?:experience|employment|work history|professional experience)[\s\-:]*\n([\s\S]*?)(?:\n\n[A-Za-z\s]*[:\-]|education|skills|$)/i);
  
  if (expSectionMatch) {
    const expText = expSectionMatch[1];
    const expEntries = parseExperienceEntries(expText);
    experience.push(...expEntries);
  }
  
  return experience;
}

function parseExperienceEntries(text: string): WorkExperience[] {
  const entries: WorkExperience[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentEntry: Partial<WorkExperience> | null = null;
  let descriptionLines: string[] = [];
  
  for (const line of lines) {
    // Check if this line looks like a job title/company line
    if (looksLikeJobTitleLine(line)) {
      // Save previous entry if exists
      if (currentEntry) {
        currentEntry.description = descriptionLines.join(' ');
        entries.push(currentEntry as WorkExperience);
      }
      
      // Start new entry
      const parsed = parseJobTitleLine(line);
      currentEntry = {
        title: parsed.title,
        company: parsed.company,
        location: parsed.location,
        dates: parsed.dates,
        duration: calculateDuration(parsed.dates),
        responsibilities: [],
        achievements: [],
        description: ''
      };
      descriptionLines = [];
    } else if (currentEntry && line.length > 10) {
      // This looks like description text
      descriptionLines.push(line);
      
      // Try to extract responsibilities and achievements
      if (line.toLowerCase().includes('responsible for') || line.toLowerCase().includes('duties included')) {
        currentEntry.responsibilities?.push(line);
      } else if (line.toLowerCase().includes('achieved') || line.toLowerCase().includes('accomplished') || line.includes('increased') || line.includes('improved')) {
        currentEntry.achievements?.push(line);
      }
    }
  }
  
  // Save last entry
  if (currentEntry) {
    currentEntry.description = descriptionLines.join(' ');
    entries.push(currentEntry as WorkExperience);
  }
  
  return entries;
}

function extractEducation(text: string): Education[] {
  const education: Education[] = [];
  
  // Look for education section
  const eduSectionMatch = text.match(/(?:education|academic background|qualifications)[\s\-:]*\n([\s\S]*?)(?:\n\n[A-Za-z\s]*[:\-]|experience|skills|$)/i);
  
  if (eduSectionMatch) {
    const eduText = eduSectionMatch[1];
    const eduEntries = parseEducationEntries(eduText);
    education.push(...eduEntries);
  }
  
  return education;
}

function parseEducationEntries(text: string): Education[] {
  const entries: Education[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (const line of lines) {
    const parsed = parseEducationLine(line);
    if (parsed.degree && parsed.institution) {
      entries.push(parsed);
    }
  }
  
  return entries;
}

function extractSummary(text: string): string {
  // Look for summary/profile section
  const summaryMatch = text.match(/(?:summary|profile|objective|about)[\s\-:]*\n([\s\S]*?)(?:\n\n[A-Za-z\s]*[:\-]|experience|education|skills|$)/i);
  
  if (summaryMatch) {
    return summaryMatch[1].trim().substring(0, 500); // Limit to 500 chars
  }
  
  // If no summary section, try to extract first paragraph that looks like a summary
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (const line of lines) {
    if (line.length > 50 && line.length < 300 && 
        !isEmail(line) && !isPhoneNumber(line) && !looksLikeJobTitleLine(line)) {
      return line;
    }
  }
  
  return '';
}

// Helper functions
function isEmail(text: string): boolean {
  return /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/i.test(text);
}

function isPhoneNumber(text: string): boolean {
  return /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/.test(text);
}

function isLocation(text: string): boolean {
  return /([A-Za-z\s]+,\s*[A-Za-z\s]{2,})|([A-Za-z\s]+,\s*[A-Z]{2})/.test(text);
}

function looksLikeSkill(text: string): boolean {
  const skillIndicators = [
    'programming', 'development', 'database', 'framework', 'library', 'api',
    'cloud', 'server', 'tool', 'platform', 'software', 'system', 'language'
  ];
  
  return skillIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  ) || /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(text);
}

function looksLikeJobTitleLine(text: string): boolean {
  // Check if line contains job title indicators
  const jobTitleIndicators = [
    'engineer', 'developer', 'manager', 'director', 'analyst', 'specialist',
    'coordinator', 'consultant', 'executive', 'officer', 'lead', 'senior',
    'junior', 'associate', 'assistant', 'supervisor', 'head', 'chief'
  ];
  
  const hasJobTitle = jobTitleIndicators.some(indicator => 
    text.toLowerCase().includes(indicator)
  );
  
  // Also check if it has date patterns
  const hasDate = /\d{4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current)\b/i.test(text);
  
  return hasJobTitle && (hasDate || text.length < 100);
}

function parseJobTitleLine(text: string): { title: string; company: string; location: string; dates: string } {
  // This is a simplified parser - in production, you'd want more sophisticated NLP
  const result = { title: '', company: '', location: '', dates: '' };
  
  // Extract dates first
  const dateMatch = text.match(/(?:\w+\s+)?\d{4}\s*[-–—]\s*(?:\w+\s+)?\d{4}|(?:\w+\s+)?\d{4}\s*[-–—]\s*(?:present|current)/i);
  if (dateMatch) {
    result.dates = dateMatch[0];
    text = text.replace(dateMatch[0], '');
  }
  
  // Extract location (city, state pattern)
  const locationMatch = text.match(/([A-Za-z\s]+,\s*[A-Za-z\s]+)|([A-Za-z\s]+,\s*[A-Z]{2})/);
  if (locationMatch) {
    result.location = locationMatch[0];
    text = text.replace(locationMatch[0], '');
  }
  
  // Remaining text should be title and company
  const parts = text.split(/[|,\-–—]/).map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length >= 2) {
    // Assume first part is title, second is company
    result.title = parts[0];
    result.company = parts[1];
  } else if (parts.length === 1) {
    // Could be either title or company - guess based on content
    const part = parts[0];
    if (looksLikeJobTitleLine(part)) {
      result.title = part;
    } else {
      result.company = part;
    }
  }
  
  return result;
}

function parseEducationLine(text: string): Education {
  const education: Education = {
    degree: '',
    institution: '',
    location: '',
    dates: ''
  };
  
  // Extract dates
  const dateMatch = text.match(/\d{4}/g);
  if (dateMatch && dateMatch.length > 0) {
    education.dates = dateMatch.join(' - ');
  }
  
  // Extract degree
  const degreeMatch = text.match(new RegExp(EDUCATION_KEYWORDS.join('|'), 'i'));
  if (degreeMatch) {
    education.degree = degreeMatch[0];
  }
  
  // Extract institution
  const institutionMatch = text.match(new RegExp(UNIVERSITY_KEYWORDS.join('|'), 'i'));
  if (institutionMatch) {
    // Find the full institution name
    const words = text.split(/\s+/);
    let institutionStart = -1;
    let institutionEnd = -1;
    
    words.forEach((word, index) => {
      if (UNIVERSITY_KEYWORDS.some(keyword => word.toLowerCase().includes(keyword.toLowerCase()))) {
        if (institutionStart === -1) institutionStart = index;
        institutionEnd = index;
      }
    });
    
    if (institutionStart !== -1) {
      education.institution = words.slice(Math.max(0, institutionStart - 2), institutionEnd + 3).join(' ');
    }
  }
  
  // Extract location
  const locationMatch = text.match(/([A-Za-z\s]+,\s*[A-Za-z\s]+)|([A-Za-z\s]+,\s*[A-Z]{2})/);
  if (locationMatch) {
    education.location = locationMatch[0];
  }
  
  // Extract GPA
  const gpaMatch = text.match(/(?:GPA|gpa)[:\s]*([0-4]\.\d{1,2})/);
  if (gpaMatch) {
    education.gpa = parseFloat(gpaMatch[1]);
  }
  
  return education;
}

function calculateDuration(dateString: string): number {
  // This is a simplified duration calculation
  // In production, you'd want more sophisticated date parsing
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  // Extract years
  const yearMatches = dateString.match(/\d{4}/g);
  if (!yearMatches || yearMatches.length < 2) {
    return 0;
  }
  
  const startYear = parseInt(yearMatches[0]);
  const endYear = parseInt(yearMatches[1]);
  
  if (dateString.toLowerCase().includes('present') || dateString.toLowerCase().includes('current')) {
    return (new Date().getFullYear() - startYear) * 12;
  }
  
  return (endYear - startYear) * 12;
}