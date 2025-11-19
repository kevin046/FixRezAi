import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent } from '../ui/card'
import { Briefcase, Target } from 'lucide-react'

interface JobTitleStepProps {
  jobTitle: string
  onJobTitleChange: (jobTitle: string) => void
}

export function JobTitleStep({ jobTitle, onJobTitleChange }: JobTitleStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          What job are you applying for?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Enter the specific job title or position you're targeting. This helps our AI tailor your resume with the most relevant keywords and skills.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="text-base font-medium">
                Job Title or Position
              </Label>
              <Input
                id="jobTitle"
                type="text"
                placeholder="e.g., Software Engineer, Marketing Manager, Data Analyst..."
                value={jobTitle}
                onChange={(e) => onJobTitleChange(e.target.value)}
                className="h-12 px-4 text-base"
                autoFocus
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Pro Tip
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Be specific with your job title. Instead of "Developer", use "Frontend React Developer" or "Senior Full-Stack Engineer". This helps the AI optimize your resume for the exact role you want.
                  </p>
                </div>
              </div>
            </div>

            {jobTitle.trim() && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Great! Your resume will be optimized for: <strong>{jobTitle}</strong>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
        <p>
          Don't worry if you're not sure about the exact title. You can always come back and adjust it later.
        </p>
      </div>
    </div>
  )
}
