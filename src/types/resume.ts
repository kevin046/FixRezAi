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
}

export interface OptimizationResponse {
  success: boolean;
  data?: OptimizedResume;
  error?: string;
}