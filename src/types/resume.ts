export interface Header {
  name: string;
  contact: string;
}

export interface Experience {
  company: string;
  location: string;
  dates: string;
  title: string;
  bullets: string[];
}

export interface Education {
  school: string;
  location: string;
  dates: string;
  degree: string;
  bullets?: string[];
}

export interface AdditionalInformation {
  technical_skills?: string;
  languages?: string;
  certifications?: string;
  awards?: string;
}

export type ToneOption = 'Professional' | 'Creative' | 'Technical' | 'Executive'
export type IndustryOption = 'Tech' | 'Finance' | 'Healthcare' | 'Marketing' | 'Education' | 'Consulting' | 'Sales' | 'Operations' | 'Product' | 'Design'
export type StyleOption = 'Conservative' | 'Modern' | 'Achievement-focused'
export type ATSLevelOption = 'Basic' | 'Advanced' | 'Aggressive'

export interface AIOptions {
  tone: ToneOption;
  industry: IndustryOption;
  style: StyleOption;
  atsLevel: ATSLevelOption;
}

export interface ATSAnalysis {
  score: number; // 0-100
  keywordCoverage: number; // 0-100
  structureScore: number; // 0-100
  formattingScore: number; // 0-100
  extractedKeywords: string[];
  suggestions: string[];
}

export interface OptimizedResume {
  header: Header;
  summary: string;
  experience: Experience[];
  education: Education[];
  additional: AdditionalInformation;
}

export interface OptimizationRequest {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
  options?: AIOptions;
}

export interface OptimizationResponse {
  success: boolean;
  data?: OptimizedResume;
  error?: string;
}