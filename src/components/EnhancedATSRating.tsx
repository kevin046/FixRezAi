import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Target, 
  FileText, 
  Upload, 
  BarChart3, 
  Clock, 
  Shield,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { parseFile } from '@/lib/fileParser';
import { analyzeResumeAgainstJob, JobSpecificATSScore } from '@/lib/jobSpecificATSScoring';
import { autocompleteJobTitle } from '@/lib/jobTitleAutocomplete';
import { matchResumeToJob } from '@/lib/semanticAnalysis';
import { isVerified } from '@/lib/auth';

interface EnhancedATSRatingProps {
  className?: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

const JOB_TITLE_SUGGESTIONS = [
  'Software Engineer', 'Data Scientist', 'Product Manager', 'Marketing Manager',
  'Business Analyst', 'UX Designer', 'DevOps Engineer', 'Sales Manager',
  'Financial Analyst', 'HR Manager', 'Operations Manager', 'Content Writer',
  'Digital Marketing Specialist', 'Full Stack Developer', 'Backend Developer',
  'Frontend Developer', 'Mobile Developer', 'Data Analyst', 'System Administrator'
];

export function EnhancedATSRating({ className = '' }: EnhancedATSRatingProps) {
  const { user, verificationStatus } = useAuthStore();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [atsScore, setAtsScore] = useState<JobSpecificATSScore | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxChars = 5000; // Increased from 2000 to accommodate longer job descriptions

  // Check if user is verified and logged in
  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the ATS Rating tool');
      return;
    }
    
    // Use the enhanced verification status if available, otherwise fall back to isVerified
    const isUserVerified = verificationStatus ? 
      Boolean(verificationStatus.verified ?? (verificationStatus as any).is_verified) : 
      isVerified(user);
    
    if (!isUserVerified) {
      toast.error('Please verify your account to access the ATS Rating tool');
      return;
    }
  }, [user, verificationStatus]);

  // Update character count for job description
  useEffect(() => {
    setCharCount(jobDescription.length);
  }, [jobDescription]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf', 
      'text/plain', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word document, or text file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Please upload a file smaller than 10MB.');
      return;
    }

    setResumeFile(file);
    toast.success('Resume uploaded successfully!');
  };

  const handleJobTitleChange = (value: string) => {
    setJobTitle(value);
    setShowJobSuggestions(value.length > 0);
  };

  const selectJobTitle = (title: string) => {
    setJobTitle(title);
    setShowJobSuggestions(false);
  };

  const handleJobDescriptionChange = (value: string) => {
    if (value.length <= maxChars) {
      setJobDescription(value);
    } else {
      // If pasted content exceeds limit, truncate it and notify user
      const truncated = value.substring(0, maxChars);
      setJobDescription(truncated);
      toast.warning(`Job description truncated to ${maxChars} characters. Please review and edit as needed.`);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    
    if (pastedText.length > maxChars) {
      const truncated = pastedText.substring(0, maxChars);
      setJobDescription(truncated);
      toast.warning(`Pasted content was ${pastedText.length} characters and has been truncated to ${maxChars} characters. Please review and edit as needed.`);
    } else {
      setJobDescription(pastedText);
    }
  };

  const startAnalysis = async () => {
    if (!resumeFile) {
      toast.error('Please upload your resume');
      return;
    }

    if (!jobTitle.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    if (!jobDescription.trim() || jobDescription.length < 50) {
      toast.error('Please enter a detailed job description (minimum 50 characters)');
      return;
    }

    setIsProcessing(true);
    setShowResults(false);
    
    // Initialize processing steps
    const steps: ProcessingStep[] = [
      { id: 'upload', name: 'Secure Upload', status: 'processing' },
      { id: 'parse', name: 'Resume Parsing', status: 'pending' },
      { id: 'analyze', name: 'Job Analysis', status: 'pending' },
      { id: 'keywords', name: 'Keyword Matching', status: 'pending' },
      { id: 'skills', name: 'Skills Alignment', status: 'pending' },
      { id: 'experience', name: 'Experience Analysis', status: 'pending' },
      { id: 'education', name: 'Education Check', status: 'pending' },
      { id: 'score', name: 'Score Calculation', status: 'pending' }
    ];
    
    setProcessingSteps(steps);

    try {
    // Extract text using the same logic as optimize flow
    const extractedText = await parseFile(resumeFile);
    const formData = new FormData();
    formData.append('jobTitle', jobTitle);
    formData.append('jobDescription', jobDescription);
    formData.append('resumeText', extractedText);
    formData.append('resume', resumeFile);

      // Step 1: Upload and start analysis
      updateStepStatus('upload', 'processing');
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const response = await fetch('/api/ats/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include' // Include session cookies
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const { sessionId } = await response.json();
      updateStepStatus('upload', 'completed', 'Resume uploaded securely');

      // Poll for progress
      let analysisComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)

      while (!analysisComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;

        const progressResponse = await fetch(`/api/ats/progress/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          credentials: 'include'
        });

        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          updateProgressFromServer(progressData);
          
          if (progressData.progress >= 100) {
            analysisComplete = true;
          }
        }
      }

      if (analysisComplete) {
        // Get final results
        const resultsResponse = await fetch(`/api/ats/results/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          credentials: 'include'
        });

        if (resultsResponse.ok) {
          const { results } = await resultsResponse.json();
          setAtsScore(results.atsScore);
          setShowResults(true);
          toast.success('ATS analysis completed successfully!');
        } else {
          throw new Error('Failed to retrieve analysis results');
        }
      } else {
        throw new Error('Analysis timed out. Please try again.');
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed. Please try again or contact support.');
      updateStepStatus('score', 'error', 'Analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], message?: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message: message || step.message }
        : step
    ));
  };

  const updateProgressFromServer = (progressData: { progress: number; step: string; message?: string }) => {
    const { progress, step, message } = progressData;
    
    // Map server steps to our UI steps
    const stepMapping: { [key: string]: string } = {
      'upload_validation': 'upload',
      'file_parsing': 'parse',
      'text_extraction': 'analyze',
      'resume_analysis': 'keywords',
      'job_matching': 'skills',
      'scoring_calculation': 'experience',
      'recommendations': 'education',
      'final_results': 'score'
    };

    const uiStepId = stepMapping[step] || step;
    
    // Update all steps up to current step as completed
    setProcessingSteps(prev => prev.map(step => {
      const stepOrder = ['upload', 'parse', 'analyze', 'keywords', 'skills', 'experience', 'education', 'score'];
      const currentStepIndex = stepOrder.indexOf(uiStepId);
      const stepIndex = stepOrder.indexOf(step.id);
      
      if (stepIndex < currentStepIndex) {
        return { ...step, status: 'completed' as const };
      } else if (stepIndex === currentStepIndex) {
        return { ...step, status: 'processing' as const, message: message || step.message };
      }
      return step;
    }));
  };

  const resetAnalysis = () => {
    setResumeFile(null);
    setJobTitle('');
    setJobDescription('');
    setAtsScore(null);
    setShowResults(false);
    setProcessingSteps([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Check if user has access
  const isUserVerified = verificationStatus ? 
    Boolean(verificationStatus.verified ?? (verificationStatus as any).is_verified) : 
    isVerified(user);
  
  if (!user || !isUserVerified) {
    return (
      <Card className={`${className} bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20`}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
              Access Restricted
            </h3>
            <p className="text-red-700 dark:text-red-400 mb-4">
              This feature is only available to verified users. Please log in and verify your account to access the ATS Rating tool.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => window.location.href = '/auth?mode=login'}
                variant="outline"
              >
                Log In
              </Button>
              <Button 
                onClick={() => window.location.href = '/auth?mode=register'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Professional ATS Rating
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-white dark:bg-gray-800">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
            <Badge variant="outline" className="text-xs bg-white dark:bg-gray-800">
              AI-Powered
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Privacy and Security Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Secure & Private Analysis
                </p>
                <button
                  onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showPrivacyInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {showPrivacyInfo && (
                <div className="mt-2 text-xs text-blue-700 dark:text-blue-400 space-y-1">
                  <p>• Files are encrypted during upload and processing</p>
                  <p>• Your resume is automatically deleted after 30 days</p>
                  <p>• No data is shared with third parties</p>
                  <p>• Processing is completed within 30 seconds</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {!showResults ? (
          <div className="space-y-6">
            {/* Resume Upload */}
            <div className="space-y-2">
              <Label htmlFor="resume-upload" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload Resume <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <input
                  ref={fileInputRef}
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto" />
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      disabled={isProcessing}
                    >
                      Click to upload
                    </button>
                    <span className="text-gray-500 dark:text-gray-400"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDF, Word, or TXT files up to 10MB
                  </p>
                </div>
                {resumeFile && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-300">
                        {resumeFile.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Job Title Input */}
            <div className="space-y-2 relative">
              <Label htmlFor="job-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="job-title"
                type="text"
                placeholder="e.g., Software Engineer, Marketing Manager"
                value={jobTitle}
                onChange={(e) => handleJobTitleChange(e.target.value)}
                onFocus={() => setShowJobSuggestions(true)}
                onBlur={() => setTimeout(() => setShowJobSuggestions(false), 200)}
                disabled={isProcessing}
                className="bg-white dark:bg-gray-800"
              />
              {showJobSuggestions && jobTitle && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {JOB_TITLE_SUGGESTIONS
                    .filter(title => title.toLowerCase().includes(jobTitle.toLowerCase()))
                    .slice(0, 8)
                    .map((title) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => selectJobTitle(title)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      >
                        {title}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="space-y-2">
              <Label htmlFor="job-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="job-description"
                placeholder="Paste the complete job description here... Include responsibilities, requirements, and qualifications."
                value={jobDescription}
                onChange={(e) => handleJobDescriptionChange(e.target.value)}
                onPaste={handlePaste}
                disabled={isProcessing}
                rows={6}
                className="bg-white dark:bg-gray-800 resize-none"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>Minimum 50 characters • Paste long descriptions freely</span>
                <span className={charCount > maxChars * 0.9 ? 'text-orange-500 font-medium' : ''}>
                  {charCount}/{maxChars}
                </span>
              </div>
            </div>

            {/* Processing Steps */}
            {isProcessing && (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-300">
                    Analysis Progress
                  </h4>
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div className="space-y-2">
                  {processingSteps.map((step) => (
                    <div key={step.id} className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                        step.status === 'error' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`}>
                        {step.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                        {step.status === 'processing' && <Loader2 className="w-3 h-3 text-white animate-spin" />}
                        {step.status === 'error' && <XCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${
                          step.status === 'completed' ? 'text-green-700 dark:text-green-400' :
                          step.status === 'processing' ? 'text-blue-700 dark:text-blue-400' :
                          step.status === 'error' ? 'text-red-700 dark:text-red-400' :
                          'text-gray-500 dark:text-gray-400'
                        }`}>
                          {step.name}
                        </p>
                        {step.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {step.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              onClick={startAnalysis}
              disabled={isProcessing || !resumeFile || !jobTitle || !jobDescription || jobDescription.length < 50}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Start ATS Analysis
                </>
              )}
            </Button>
          </div>
        ) : (
          <ATSRatingResults score={atsScore} onReset={resetAnalysis} />
        )}
      </CardContent>
    </Card>
  );
}

// Results Component
function ATSRatingResults({ score, onReset }: { score: JobSpecificATSScore; onReset: () => void }) {
  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 85) return 'text-green-600';
    if (scoreValue >= 70) return 'text-blue-600';
    if (scoreValue >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (scoreValue: number) => {
    if (scoreValue >= 85) return 'bg-green-100';
    if (scoreValue >= 70) return 'bg-blue-100';
    if (scoreValue >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBg(score.totalScore)}`}>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(score.totalScore)}`}>
              {score.totalScore}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {score.overallAssessment.matchLevel}
            </div>
          </div>
        </div>
        <h3 className={`text-xl font-semibold mt-4 ${getScoreColor(score.totalScore)}`}>
          {score.overallAssessment.matchLevel} Job Match
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Your resume shows {score.totalScore <= 50 ? 'limited' : score.totalScore <= 75 ? 'moderate' : 'strong'} alignment with this position
        </p>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Detailed Analysis</h4>
        
        {/* Keyword Match */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Keyword Match</span>
              <span className="text-xs text-gray-500">(40%)</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(score.jobMatch.score)}`}>
              {score.jobMatch.score}%
            </span>
          </div>
          <Progress value={score.jobMatch.score} className="h-2" />
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {score.jobMatch.keywordMatchPercentage || 0}% of job keywords found ({(score.jobMatch.keywordsFound || []).length}/{(score.jobMatch.keywordsFound || []).length + (score.jobMatch.keywordsMissing || []).length})
          </div>
        </div>

        {/* Skills Alignment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Skills Alignment</span>
              <span className="text-xs text-gray-500">(30%)</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(score.skillsAlignment.score)}`}>
              {score.skillsAlignment.score}%
            </span>
          </div>
          <Progress value={score.skillsAlignment.score} className="h-2" />
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {score.skillsAlignment.skillsMatchPercentage || 0}% of required skills found
          </div>
        </div>

        {/* Experience Relevance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Experience Relevance</span>
              <span className="text-xs text-gray-500">(20%)</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(score.experienceRelevance.score)}`}>
              {score.experienceRelevance.score}%
            </span>
          </div>
          <Progress value={score.experienceRelevance.score} className="h-2" />
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {score.experienceRelevance.relevantYears || 0} years experience vs {score.experienceRelevance.requiredYears || 2} required
          </div>
        </div>

        {/* Education Match */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Education Requirements</span>
              <span className="text-xs text-gray-500">(10%)</span>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(score.educationRequirements.score)}`}>
              {score.educationRequirements.score}%
            </span>
          </div>
          <Progress value={score.educationRequirements.score} className="h-2" />
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {score.educationRequirements.requiredEducationFound ? 'Requirements met' : 'Requirements not met'}
          </div>
        </div>
      </div>

      {/* Strengths */}
      {score.overallAssessment.keyStrengths && score.overallAssessment.keyStrengths.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h5 className="font-semibold text-green-900 dark:text-green-300">Key Strengths</h5>
          </div>
          <ul className="space-y-1 text-sm text-green-800 dark:text-green-400">
            {score.overallAssessment.keyStrengths.map((strength, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-green-500 mt-1">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Areas */}
      {score.overallAssessment.improvementAreas && score.overallAssessment.improvementAreas.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h5 className="font-semibold text-yellow-900 dark:text-yellow-300">Areas for Improvement</h5>
          </div>
          <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-400">
            {score.overallAssessment.improvementAreas.map((area, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {score.overallAssessment.nextSteps && score.overallAssessment.nextSteps.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Info className="w-5 h-5 text-blue-600" />
            <h5 className="font-semibold text-blue-900 dark:text-blue-300">Recommended Next Steps</h5>
          </div>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
            {score.overallAssessment.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button 
          onClick={onReset}
          variant="outline"
          className="flex-1"
        >
          Analyze Another Resume
        </Button>
        <Button 
          onClick={() => {
            // Copy analysis results to clipboard for user reference
            const analysisSummary = `ATS Score: ${score.totalScore}/100 (${score.overallAssessment.matchLevel})\n\nKey Findings:\n- Keyword Match: ${score.jobMatch.score}%\n- Skills Alignment: ${score.skillsAlignment.score}%\n- Experience Relevance: ${score.experienceRelevance.score}%\n- Education Match: ${score.educationRequirements.score}%\n\nTop Recommendations:\n${score.overallAssessment.nextSteps.slice(0, 3).join('\n- ')}`;
            navigator.clipboard.writeText(analysisSummary);
            toast.success('Analysis summary copied to clipboard!');
          }}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Target className="w-4 h-4 mr-2" />
          Copy Analysis Summary
        </Button>
      </div>
    </div>
  );
}
