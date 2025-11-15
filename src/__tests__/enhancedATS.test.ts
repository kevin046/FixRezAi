import { describe, it, expect } from 'vitest';
import { analyzeResumeAgainstJob } from '../lib/jobSpecificATSScoring';
import { parseResumeAdvanced } from '../lib/resumeParserAdvanced';
import { matchResumeToJob } from '../lib/semanticAnalysis';
import { autocompleteJobTitle } from '../lib/jobTitleAutocomplete';

describe('Enhanced ATS Rating System', () => {
  const sampleResume = {
    header: {
      name: 'John Doe',
      contact: 'john.doe@email.com • (555) 123-4567 • San Francisco, CA'
    },
    summary: 'Experienced software engineer with 5+ years of experience in web development.',
    experience: [{
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      dates: '2020 - Present',
      bullets: ['Developed web applications using React and Node.js', 'Improved performance by 30%', 'Designed and implemented REST APIs']
    }],
    education: [{
      school: 'University of Technology',
      location: 'San Francisco, CA',
      dates: '2016 - 2020',
      degree: 'Bachelor of Science in Computer Science'
    }],
    additional: {
      technical_skills: 'JavaScript, React, Node.js, Python, SQL, Git',
      languages: '',
      certifications: '',
      awards: ''
    },
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Git'],
    contactInfo: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      phone: '(555) 123-4567',
      location: 'San Francisco, CA'
    },
    rawText: 'John Doe\nSoftware Engineer with 5+ years experience\nSkills: JavaScript, React, Node.js, Python, SQL\nExperience: Tech Corp 2020-Present\nEducation: BS Computer Science'
  };

  const jobTitle = 'Software Engineer';
  const jobDescription = `
    We are looking for an experienced Software Engineer to join our team.
    Requirements:
    - 3+ years of experience in software development
    - Strong proficiency in JavaScript and React
    - Experience with Node.js and Python
    - Database experience with SQL
    - Version control with Git
    - Excellent problem-solving skills
    - Bachelor's degree in Computer Science or related field
  `;

  describe('Job Title Autocomplete', () => {
    it('should return relevant job titles for "software" query', () => {
      const results = autocompleteJobTitle('software');
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title.toLowerCase()).toContain('software');
    });

    it('should return top job titles for empty query', () => {
      const results = autocompleteJobTitle('');
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(10); // Default limit
      expect(results[0].frequency).toBeGreaterThan(results[9].frequency);
    });

    it('should handle partial matches', () => {
      const results = autocompleteJobTitle('eng');
      expect(results.some(r => r.title.toLowerCase().includes('engineer'))).toBe(true);
    });
  });

  describe('Semantic Analysis', () => {
    it('should calculate semantic similarity between resume and job description', () => {
      const result = matchResumeToJob(sampleResume.rawText, jobDescription);
      
      expect(result).toHaveProperty('overallMatch');
      expect(result).toHaveProperty('skillMatches');
      expect(result).toHaveProperty('experienceMatches');
      expect(result).toHaveProperty('educationMatches');
      expect(result).toHaveProperty('keywordMatches');
      expect(result).toHaveProperty('missingKeywords');
      expect(result).toHaveProperty('suggestions');
      
      expect(result.overallMatch).toBeGreaterThanOrEqual(0);
      expect(result.overallMatch).toBeLessThanOrEqual(1);
    });

    it('should identify missing keywords', () => {
      const result = matchResumeToJob(sampleResume.rawText, jobDescription);
      expect(result.missingKeywords).toBeInstanceOf(Array);
    });

    it('should provide improvement suggestions', () => {
      const result = matchResumeToJob(sampleResume.rawText, jobDescription);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Job-Specific ATS Scoring', () => {
    it('should calculate comprehensive ATS score', () => {
      const result = analyzeResumeAgainstJob(sampleResume, jobTitle, jobDescription);
      
      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('jobMatch');
      expect(result).toHaveProperty('skillsAlignment');
      expect(result).toHaveProperty('experienceRelevance');
      expect(result).toHaveProperty('educationRequirements');
      expect(result).toHaveProperty('overallAssessment');
      
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      
      // Check weighted scoring
      expect(result.jobMatch.score).toBeGreaterThanOrEqual(0);
      expect(result.skillsAlignment.score).toBeGreaterThanOrEqual(0);
      expect(result.experienceRelevance.score).toBeGreaterThanOrEqual(0);
      expect(result.educationRequirements.score).toBeGreaterThanOrEqual(0);
    });

    it('should provide detailed breakdown for each scoring category', () => {
      const result = analyzeResumeAgainstJob(sampleResume, jobTitle, jobDescription);
      
      // Job Match details
      expect(result.jobMatch).toHaveProperty('score');
      expect(result.jobMatch).toHaveProperty('keywordsFound');
      expect(result.jobMatch).toHaveProperty('keywordsMissing');
      expect(result.jobMatch).toHaveProperty('keywordMatchPercentage');
      
      // Skills Alignment details
      expect(result.skillsAlignment).toHaveProperty('score');
      expect(result.skillsAlignment).toHaveProperty('requiredSkillsFound');
      expect(result.skillsAlignment).toHaveProperty('requiredSkillsMissing');
      expect(result.skillsAlignment).toHaveProperty('skillsMatchPercentage');
      
      // Experience Relevance details
      expect(result.experienceRelevance).toHaveProperty('score');
      expect(result.experienceRelevance).toHaveProperty('relevantYears');
      expect(result.experienceRelevance).toHaveProperty('requiredYears');
      expect(result.experienceRelevance).toHaveProperty('experienceMatch');
      expect(result.experienceRelevance).toHaveProperty('details');
      
      // Education Requirements details
      expect(result.educationRequirements).toHaveProperty('score');
      expect(result.educationRequirements).toHaveProperty('requiredEducationFound');
      expect(result.educationRequirements).toHaveProperty('educationLevel');
      expect(result.educationRequirements).toHaveProperty('details');
    });

    it('should provide overall assessment with match level', () => {
      const result = analyzeResumeAgainstJob(sampleResume, jobTitle, jobDescription);
      
      expect(result.overallAssessment).toHaveProperty('matchLevel');
      expect(result.overallAssessment).toHaveProperty('keyStrengths');
      expect(result.overallAssessment).toHaveProperty('improvementAreas');
      expect(result.overallAssessment).toHaveProperty('nextSteps');
      
      const validMatchLevels = ['Poor', 'Fair', 'Good', 'Excellent'];
      expect(validMatchLevels).toContain(result.overallAssessment.matchLevel);
    });
  });

  describe('Integration Test', () => {
    it('should provide consistent scoring across different analysis methods', () => {
      const semanticResult = matchResumeToJob(sampleResume.rawText, jobDescription);
      const atsResult = analyzeResumeAgainstJob(sampleResume, jobTitle, jobDescription);
      
      // Both should provide reasonable scores
      expect(semanticResult.overallMatch).toBeGreaterThan(0.1); // At least 10% match
      expect(atsResult.totalScore).toBeGreaterThan(20); // At least 20/100 score
      
      // Higher semantic match should generally correlate with higher ATS score
      if (semanticResult.overallMatch > 0.7) {
        expect(atsResult.totalScore).toBeGreaterThan(60);
      }
    });

    it('should handle edge cases gracefully', () => {
      // Empty inputs
      expect(() => analyzeResumeAgainstJob(sampleResume, '', '')).not.toThrow();
      expect(() => matchResumeToJob('', '')).not.toThrow();
      
      // Very short inputs
      expect(() => analyzeResumeAgainstJob(sampleResume, 'A', 'B')).not.toThrow();
      expect(() => matchResumeToJob('A', 'B')).not.toThrow();
    });
  });
});