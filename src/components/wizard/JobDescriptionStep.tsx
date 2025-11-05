import { Textarea } from '../ui/textarea'
import { Card } from '../ui/card'
import { FileText, AlertCircle } from 'lucide-react'

interface JobDescriptionStepProps {
  jobDescription: string
  onJobDescriptionChange: (value: string) => void
}

export function JobDescriptionStep({ jobDescription, onJobDescriptionChange }: JobDescriptionStepProps) {
  const wordCount = jobDescription.trim().split(/\s+/).filter(word => word.length > 0).length
  const minWords = 50
  const isValid = wordCount >= minWords

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Paste the Job Description
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Copy and paste the complete job posting you're applying for. The AI will analyze the requirements, 
          skills, and keywords to optimize your resume accordingly.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label htmlFor="job-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Job Description *
            </label>
            <div className={`text-sm ${isValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {wordCount} / {minWords} words minimum
            </div>
          </div>
          
          <Textarea
            id="job-description"
            placeholder="Paste the complete job description here...

Example:
We are seeking a Senior Software Engineer to join our dynamic team. The ideal candidate will have:
- 5+ years of experience in React, TypeScript, and Node.js
- Strong knowledge of cloud platforms (AWS, Azure)
- Experience with microservices architecture
- Excellent problem-solving skills
..."
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
            className="min-h-[300px] resize-none"
          />
          
          {!isValid && jobDescription.length > 0 && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              Please provide a more detailed job description (at least {minWords} words) for better optimization results.
            </div>
          )}
        </div>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Tips for better results:</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Include the complete job posting, not just a summary</li>
          <li>• Make sure to include required skills, qualifications, and responsibilities</li>
          <li>• Include company information if available</li>
          <li>• Don't edit or modify the original job description</li>
        </ul>
      </div>
    </div>
  )
}
