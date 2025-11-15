export interface JobTitleSuggestion {
  title: string;
  category: string;
  frequency: number;
}

export const JOB_TITLE_DATABASE: JobTitleSuggestion[] = [
  // Technology
  { title: 'Software Engineer', category: 'Technology', frequency: 1000 },
  { title: 'Senior Software Engineer', category: 'Technology', frequency: 800 },
  { title: 'Full Stack Developer', category: 'Technology', frequency: 700 },
  { title: 'Frontend Developer', category: 'Technology', frequency: 600 },
  { title: 'Backend Developer', category: 'Technology', frequency: 550 },
  { title: 'DevOps Engineer', category: 'Technology', frequency: 500 },
  { title: 'Data Scientist', category: 'Technology', frequency: 450 },
  { title: 'Data Engineer', category: 'Technology', frequency: 400 },
  { title: 'Machine Learning Engineer', category: 'Technology', frequency: 350 },
  { title: 'AI Engineer', category: 'Technology', frequency: 300 },
  { title: 'Cloud Architect', category: 'Technology', frequency: 280 },
  { title: 'Security Engineer', category: 'Technology', frequency: 250 },
  { title: 'Mobile Developer', category: 'Technology', frequency: 240 },
  { title: 'iOS Developer', category: 'Technology', frequency: 230 },
  { title: 'Android Developer', category: 'Technology', frequency: 220 },
  { title: 'Site Reliability Engineer', category: 'Technology', frequency: 200 },
  { title: 'Database Administrator', category: 'Technology', frequency: 180 },
  { title: 'Systems Administrator', category: 'Technology', frequency: 170 },
  { title: 'Network Engineer', category: 'Technology', frequency: 160 },
  { title: 'QA Engineer', category: 'Technology', frequency: 150 },
  
  // Management
  { title: 'Product Manager', category: 'Management', frequency: 900 },
  { title: 'Project Manager', category: 'Management', frequency: 800 },
  { title: 'Engineering Manager', category: 'Management', frequency: 600 },
  { title: 'Technical Lead', category: 'Management', frequency: 500 },
  { title: 'Program Manager', category: 'Management', frequency: 400 },
  { title: 'Operations Manager', category: 'Management', frequency: 350 },
  { title: 'IT Manager', category: 'Management', frequency: 300 },
  { title: 'Marketing Manager', category: 'Management', frequency: 700 },
  { title: 'Sales Manager', category: 'Management', frequency: 650 },
  { title: 'Business Development Manager', category: 'Management', frequency: 500 },
  { title: 'Account Manager', category: 'Management', frequency: 450 },
  { title: 'Customer Success Manager', category: 'Management', frequency: 400 },
  
  // Design
  { title: 'UX Designer', category: 'Design', frequency: 600 },
  { title: 'UI Designer', category: 'Design', frequency: 550 },
  { title: 'Product Designer', category: 'Design', frequency: 500 },
  { title: 'Graphic Designer', category: 'Design', frequency: 700 },
  { title: 'Visual Designer', category: 'Design', frequency: 400 },
  { title: 'Interaction Designer', category: 'Design', frequency: 300 },
  { title: 'Motion Designer', category: 'Design', frequency: 250 },
  
  // Marketing
  { title: 'Digital Marketing Specialist', category: 'Marketing', frequency: 500 },
  { title: 'Content Marketing Manager', category: 'Marketing', frequency: 450 },
  { title: 'Social Media Manager', category: 'Marketing', frequency: 600 },
  { title: 'SEO Specialist', category: 'Marketing', frequency: 400 },
  { title: 'Growth Marketing Manager', category: 'Marketing', frequency: 350 },
  { title: 'Brand Manager', category: 'Marketing', frequency: 300 },
  { title: 'Marketing Analyst', category: 'Marketing', frequency: 250 },
  
  // Sales
  { title: 'Sales Representative', category: 'Sales', frequency: 800 },
  { title: 'Account Executive', category: 'Sales', frequency: 700 },
  { title: 'Business Development Representative', category: 'Sales', frequency: 600 },
  { title: 'Sales Engineer', category: 'Sales', frequency: 400 },
  { title: 'Territory Sales Manager', category: 'Sales', frequency: 350 },
  { title: 'Inside Sales Representative', category: 'Sales', frequency: 500 },
  
  // Finance
  { title: 'Financial Analyst', category: 'Finance', frequency: 600 },
  { title: 'Investment Banking Analyst', category: 'Finance', frequency: 500 },
  { title: 'Risk Analyst', category: 'Finance', frequency: 400 },
  { title: 'Credit Analyst', category: 'Finance', frequency: 350 },
  { title: 'Portfolio Manager', category: 'Finance', frequency: 300 },
  { title: 'Financial Advisor', category: 'Finance', frequency: 450 },
  { title: 'Tax Accountant', category: 'Finance', frequency: 400 },
  { title: 'Auditor', category: 'Finance', frequency: 380 },
  
  // Healthcare
  { title: 'Registered Nurse', category: 'Healthcare', frequency: 900 },
  { title: 'Nurse Practitioner', category: 'Healthcare', frequency: 700 },
  { title: 'Physician Assistant', category: 'Healthcare', frequency: 600 },
  { title: 'Medical Doctor', category: 'Healthcare', frequency: 800 },
  { title: 'Pharmacist', category: 'Healthcare', frequency: 500 },
  { title: 'Physical Therapist', category: 'Healthcare', frequency: 400 },
  { title: 'Occupational Therapist', category: 'Healthcare', frequency: 350 },
  
  // Education
  { title: 'Teacher', category: 'Education', frequency: 800 },
  { title: 'Professor', category: 'Education', frequency: 600 },
  { title: 'Instructional Designer', category: 'Education', frequency: 300 },
  { title: 'Curriculum Developer', category: 'Education', frequency: 250 },
  { title: 'Education Coordinator', category: 'Education', frequency: 200 },
  
  // Human Resources
  { title: 'HR Manager', category: 'Human Resources', frequency: 500 },
  { title: 'Recruiter', category: 'Human Resources', frequency: 700 },
  { title: 'Talent Acquisition Specialist', category: 'Human Resources', frequency: 400 },
  { title: 'HR Business Partner', category: 'Human Resources', frequency: 350 },
  { title: 'Compensation Analyst', category: 'Human Resources', frequency: 250 },
  { title: 'Training Specialist', category: 'Human Resources', frequency: 200 }
];

export function autocompleteJobTitle(input: string, limit: number = 10): JobTitleSuggestion[] {
  if (!input.trim()) {
    return JOB_TITLE_DATABASE
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  const query = input.toLowerCase().trim();
  
  return JOB_TITLE_DATABASE
    .filter(job => {
      const titleLower = job.title.toLowerCase();
      const categoryLower = job.category.toLowerCase();
      
      // Exact match
      if (titleLower === query) return true;
      
      // Starts with query
      if (titleLower.startsWith(query)) return true;
      
      // Contains query
      if (titleLower.includes(query)) return true;
      
      // Category contains query
      if (categoryLower.includes(query)) return true;
      
      // Word-based matching
      const titleWords = titleLower.split(/[\s\-_]+/);
      const queryWords = query.split(/[\s\-_]+/);
      
      return queryWords.some(qWord => 
        titleWords.some(titleWord => 
          titleWord.startsWith(qWord) || titleWord.includes(qWord)
        )
      );
    })
    .sort((a, b) => {
      const aTitleLower = a.title.toLowerCase();
      const bTitleLower = b.title.toLowerCase();
      const queryLower = query;
      
      // Exact matches first
      if (aTitleLower === queryLower && bTitleLower !== queryLower) return -1;
      if (bTitleLower === queryLower && aTitleLower !== queryLower) return 1;
      
      // Starts with query second
      const aStartsWith = aTitleLower.startsWith(queryLower);
      const bStartsWith = bTitleLower.startsWith(queryLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;
      
      // Frequency-based sorting
      return b.frequency - a.frequency;
    })
    .slice(0, limit);
}

export function getJobTitleCategories(): string[] {
  return [...new Set(JOB_TITLE_DATABASE.map(job => job.category))].sort();
}

export function getJobTitlesByCategory(category: string): JobTitleSuggestion[] {
  return JOB_TITLE_DATABASE
    .filter(job => job.category.toLowerCase() === category.toLowerCase())
    .sort((a, b) => b.frequency - a.frequency);
}