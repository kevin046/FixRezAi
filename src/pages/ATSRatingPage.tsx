import { EnhancedATSRating } from '@/components/EnhancedATSRating';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Medal } from 'lucide-react';

export default function ATSRatingPage() {

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => window.location.href = '/'}
              variant="ghost"
              className="inline-flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Medal className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Professional ATS Rating
              </h1>
            </div>
            
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Advanced Resume Analysis
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get a comprehensive ATS rating with job-specific analysis. Upload your resume, 
              specify your target job, and receive detailed scoring with actionable insights.
            </p>
          </div>
          
          {/* Enhanced ATS Rating Component */}
          <EnhancedATSRating />
        </div>
      </div>
    </div>
  );
}
