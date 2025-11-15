import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2, XCircle, AlertTriangle, Target, FileText, Repeat, SpellCheck, Upload, Star } from 'lucide-react';
import { calculateATSScore, ATSScore } from '@/lib/atsScoring';
import { parseFile } from '@/lib/fileParser';
import { toast } from 'sonner';

interface HomeATSRatingProps {
  className?: string;
}

const categoryIcons = {
  parseRate: FileText,
  quantifyingImpact: Target,
  repetition: Repeat,
  spellingGrammar: SpellCheck
};

const categoryTooltips = {
  parseRate: "Measures how well your resume can be parsed by ATS systems, including contact information, formatting, and required elements.",
  quantifyingImpact: "Evaluates the use of action verbs and quantifiable achievements to demonstrate your impact and results.",
  repetition: "Analyzes content redundancy, generic soft skills usage, and overall uniqueness of your content.",
  spellingGrammar: "Checks for spelling errors, grammar issues, and professional language usage throughout your resume."
};

const scoreRanges = {
  red: { min: 0, max: 50, label: 'Poor', color: 'text-red-600' },
  yellow: { min: 51, max: 75, label: 'Fair', color: 'text-yellow-600' },
  lightgreen: { min: 76, max: 90, label: 'Good', color: 'text-green-600' },
  green: { min: 91, max: 100, label: 'Excellent', color: 'text-green-700' }
};

export function HomeATSRating({ className = '' }: HomeATSRatingProps) {
  const [score, setScore] = useState<ATSScore | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word document, or text file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Please upload a file smaller than 10MB.');
      return;
    }

    setUploadedFile(file);
    setIsCalculating(true);

    try {
      // Parse the resume file
      const resumeText = await parseFile(file);
      
      // Simulate processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a basic resume structure for ATS scoring
      const basicResume = {
        header: {
          name: 'Uploaded Resume',
          contact: resumeText.substring(0, 200) // Use first 200 chars as contact info
        },
        summary: resumeText.substring(0, 500), // Use first 500 chars as summary
        experience: [{
          title: 'Professional Experience',
          company: 'Various',
          location: 'Various Locations',
          dates: 'Present',
          bullets: resumeText.split('\n').filter(line => line.trim().length > 0).slice(0, 10)
        }],
        education: [{
          school: 'Education',
          location: 'Various',
          dates: 'Various',
          degree: 'Degree'
        }],
        additional: {
          technical_skills: '',
          languages: '',
          certifications: '',
          awards: ''
        }
      };
      
      // Calculate ATS score
      const atsScore = calculateATSScore(basicResume);
      setScore(atsScore);
      
      toast.success('Your ATS rating has been calculated.');
    } catch (error) {
      console.error('Error processing resume:', error);
      toast.error('We couldn\'t process your resume. Please try again or contact support.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getScoreColor = (scoreValue: number) => {
    if (scoreValue <= 50) return 'bg-red-500';
    if (scoreValue <= 75) return 'bg-yellow-500';
    if (scoreValue <= 90) return 'bg-green-400';
    return 'bg-green-500';
  };

  const getScoreRangeInfo = (scoreValue: number) => {
    if (scoreValue <= 50) return scoreRanges.red;
    if (scoreValue <= 75) return scoreRanges.yellow;
    if (scoreValue <= 90) return scoreRanges.lightgreen;
    return scoreRanges.green;
  };

  const getCategoryIcon = (categoryKey: keyof typeof categoryIcons) => {
    const Icon = categoryIcons[categoryKey];
    return <Icon className="w-5 h-5" />;
  };

  const handleReset = () => {
    setScore(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={`${className} bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            Free ATS Rating
          </span>
          <Badge 
            variant="outline" 
            className="text-xs bg-white dark:bg-gray-800"
          >
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Info Banner */}
        {showInfoBanner && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Standalone ATS Analysis Tool
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Get your ATS score instantly without creating an account. This is a free analysis tool - no optimization required!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoBanner(false)}
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {!score ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Get Your ATS Score
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get an instant, AI-powered analysis of your resume's ATS compatibility. 
              See exactly how your resume performs against applicant tracking systems used by major companies.
            </p>
            
            {uploadedFile && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-300">
                    {uploadedFile.name}
                  </span>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isCalculating}
            />
            
            <Button 
              onClick={handleUploadClick}
              disabled={isCalculating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full"
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resume for Rating
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Supports PDF, Word, and text files up to 10MB
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200 dark:text-gray-700"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={getScoreColor(score.totalScore)}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${score.totalScore}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreRangeInfo(score.totalScore).color}`}>
                      {score.totalScore}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {getScoreRangeInfo(score.totalScore).label}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`text-lg font-semibold ${getScoreRangeInfo(score.totalScore).color} mb-2`}>
                {getScoreRangeInfo(score.totalScore).label} ATS Score
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Your resume has {score.totalScore <= 50 ? 'significant' : score.totalScore <= 75 ? 'some' : 'minimal'} ATS compatibility issues
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                ✓ Analysis complete - Your rating is ready!
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white text-center">
                Category Breakdown
              </h4>
              
              {Object.entries(score.categories).map(([key, category]) => {
                const categoryKey = key as keyof typeof categoryIcons;
                const Icon = categoryIcons[categoryKey];
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-help">
                              <Icon className={`w-4 h-4 ${
                                category.score >= 80 ? 'text-green-600' :
                                category.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {key === 'parseRate' ? 'ATS Parse Rate' :
                                 key === 'quantifyingImpact' ? 'Quantifying Impact' :
                                 key === 'repetition' ? 'Repetition Analysis' : 'Spelling & Grammar'}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-sm">
                              {categoryTooltips[categoryKey]}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className={`text-sm font-semibold ${
                        category.score >= 80 ? 'text-green-600' :
                        category.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {category.score}%
                      </span>
                    </div>
                    
                    <Progress 
                      value={category.score} 
                      className={`h-2 ${
                        category.score >= 80 ? 'bg-green-100' :
                        category.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                      }`}
                    />
                    
                    {category.details.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        {category.details.slice(0, 2).map((detail, index) => (
                          <div key={index} className="flex items-start space-x-1">
                            {detail.includes('Good') || detail.includes('Excellent') ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : detail.includes('Missing') || detail.includes('error') ? (
                              <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                            )}
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Feedback */}
            {score.feedback.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Improvement Suggestions
                </h5>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                  {score.feedback.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Analyze Another Resume
              </Button>
              <Button 
                onClick={() => {
                  // Store the current ATS score in session storage for reference
                  sessionStorage.setItem('atsScore', JSON.stringify(score));
                  // Navigate to optimization with a parameter indicating ATS rating completed
                  window.location.href = '/optimize?from_ats_rating=true';
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Star className="w-4 h-4 mr-2" />
                Improve My Score
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}