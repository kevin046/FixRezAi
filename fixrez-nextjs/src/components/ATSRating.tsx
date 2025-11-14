import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2, XCircle, AlertTriangle, Target, FileText, Repeat, SpellCheck } from 'lucide-react';
import { calculateATSScore, ATSScore } from '@/lib/atsScoring';
import { OptimizedResume } from '@/types/resume';

interface ATSRatingProps {
  resume: OptimizedResume | null;
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

export function ATSRating({ resume, className = '' }: ATSRatingProps) {
  const [score, setScore] = useState<ATSScore | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculateScore = async () => {
    if (!resume) return;
    
    setIsCalculating(true);
    
    // Simulate calculation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const atsScore = calculateATSScore(resume);
    setScore(atsScore);
    setIsCalculating(false);
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

  if (!resume) {
    return (
      <Card className={`${className} bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900`}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              ATS Rating Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload and optimize your resume to see your ATS compatibility score.
            </p>
            <Button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-upload'))}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Upload Resume
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            ATS Rating
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
        {!score ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Rate Your Resume
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get an instant ATS compatibility score and detailed feedback.
            </p>
            <Button 
              onClick={handleCalculateScore}
              disabled={isCalculating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isCalculating ? 'Calculating...' : 'Calculate ATS Score'}
            </Button>
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
                onClick={handleCalculateScore}
                variant="outline"
                className="flex-1"
              >
                Recalculate
              </Button>
              <Button 
                onClick={() => setScore(null)}
                variant="ghost"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}