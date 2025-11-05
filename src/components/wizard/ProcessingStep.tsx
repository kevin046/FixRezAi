import { useEffect, useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Progress } from '../ui/progress'
import { Sparkles, Brain, FileText, CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { optimizeResume } from '../../lib/api'
import { parseFile } from '../../lib/fileParser'
import type { OptimizedResume } from '../../types/resume'

interface ProcessingStepProps {
  jobTitle: string
  jobDescription: string
  resumeFile: File | null
  resumeText: string
  isProcessing: boolean
  onProcessingStart: () => void
  onProcessingComplete: (result: OptimizedResume) => void
  onProcessingError: (error: string) => void
}

export function ProcessingStep({
  jobTitle,
  jobDescription,
  resumeFile,
  resumeText,
  isProcessing,
  onProcessingStart,
  onProcessingComplete,
  onProcessingError
}: ProcessingStepProps) {
  // Component rendered (reduced logging)

  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState('')
  const [error, setError] = useState<{ title: string; message: string } | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  
  // Use ref to track component mount status and prevent state updates after unmount
  const isMountedRef = useRef(true)
  const processingAbortControllerRef = useRef<AbortController | null>(null)
  
  // Ensure isMountedRef is set to true on mount
  useEffect(() => {
    isMountedRef.current = true
  }, [])

  const processingSteps = [
    { id: 1, title: 'Parsing Resume', description: 'Extracting text from your resume', icon: FileText },
    { id: 2, title: 'Analyzing Job Requirements', description: 'Understanding job requirements and keywords', icon: Brain },
    { id: 3, title: 'AI Processing', description: 'Optimizing your resume content', icon: Sparkles },
    { id: 4, title: 'Finalizing', description: 'Preparing optimized content', icon: CheckCircle }
  ]

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startProcessing = async () => {
    if (isProcessing || hasStarted || !isMountedRef.current) return
    
    // Create a new AbortController for this processing session
    processingAbortControllerRef.current = new AbortController()
    
    setHasStarted(true)
    onProcessingStart()
    setError(null)
    setProgress(0)
    setElapsedTime(0)

    try {
      // Step 1: Parse resume
      if (!isMountedRef.current) return
      setCurrentTask('Parsing Resume')
      setProgress(25)
      
      console.log('🔍 ProcessingStep: Starting resume parsing with:', {
        hasResumeFile: !!resumeFile,
        resumeFileName: resumeFile?.name,
        resumeFileType: resumeFile?.type,
        resumeFileSize: resumeFile?.size,
        hasResumeText: !!resumeText,
        resumeTextLength: resumeText.length,
        resumeTextPreview: resumeText.substring(0, 100) + '...'
      });
      
      let extractedText = resumeText
      if (resumeFile) {
        console.log('📄 ProcessingStep: Parsing uploaded file...');
        try {
          extractedText = await parseFile(resumeFile)
          console.log('✅ ProcessingStep: File parsing successful:', {
            extractedTextLength: extractedText.length,
            extractedTextPreview: extractedText.substring(0, 200) + '...'
          });
        } catch (parseError) {
          console.error('❌ ProcessingStep: File parsing failed:', parseError);
          throw parseError;
        }
      } else {
        console.log('📝 ProcessingStep: Using provided resume text');
      }

      // Validate extracted text
      if (!extractedText || extractedText.trim().length === 0) {
        console.error('❌ ProcessingStep: No resume content found');
        throw new Error('No resume content found. Please upload a valid resume file or paste your resume text.');
      }

      const trimmedText = extractedText.trim();
      console.log('🔍 ProcessingStep: Resume content validation:', {
        originalLength: extractedText.length,
        trimmedLength: trimmedText.length,
        hasMinimumLength: trimmedText.length >= 50,
        contentPreview: trimmedText.substring(0, 300) + '...'
      });

      if (trimmedText.length < 50) {
        console.error('❌ ProcessingStep: Resume content too short');
        throw new Error('Resume content is too short. Please provide a more detailed resume.');
      }

      // Step 2: Analyze job requirements
      if (!isMountedRef.current) return
      setCurrentTask('Analyzing Job Requirements')
      setProgress(50)
      
      console.log('🎯 ProcessingStep: Analyzing job requirements:', {
        jobTitle: jobTitle,
        jobDescriptionLength: jobDescription.length,
        jobDescriptionPreview: jobDescription.substring(0, 200) + '...'
      });
      
      // Simulate analysis time
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 3: AI Processing
      if (!isMountedRef.current) return
      setCurrentTask('AI Processing')
      setProgress(75)
      
      console.log('🧠 ProcessingStep: Starting AI optimization with:', {
        jobTitle: jobTitle,
        jobDescriptionLength: jobDescription.length,
        resumeTextLength: extractedText.length,
        resumeContentSample: extractedText.substring(0, 500) + '...'
      });
      
      const optimizationResult = await optimizeResume({
        jobTitle,
        jobDescription,
        resumeText: extractedText
      }, (elapsed) => {
        // Only update elapsed time if component is still mounted
        if (isMountedRef.current) {
          setElapsedTime(elapsed)
        }
      })

      if (!isMountedRef.current) return

      if (optimizationResult.success && optimizationResult.data) {
        const hasParseWarning = !!(optimizationResult.data as any).warning && (optimizationResult.data as any).warning.includes('parse failure');
        if (hasParseWarning) {
          console.warn('⚠️ ProcessingStep: AI parse warning, proceeding with fallback data:', (optimizationResult.data as any).warning);
        }
        const validatedResume = validateAndSanitize(optimizationResult.data as OptimizedResume);
        if (validatedResume) {
          console.log('✅ ProcessingStep: Optimization successful' + (hasParseWarning ? ' (with warnings)' : '') + ', proceeding to finalize...');
          onProcessingComplete(validatedResume);
        } else {
          throw new Error('AI response validation failed. Retrying...');
        }
      } else {
        throw new Error(optimizationResult.error || 'Optimization failed');
      }
    } catch (err) {
      console.error('❌ ProcessingStep: Processing error:', err)
      if (isMountedRef.current) {
        const rawMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        // Provide clearer message for 500 responses and common configuration issues
        const normalized = rawMessage.toLowerCase()
        let title = 'Processing Failed'
        let message = rawMessage
        if (normalized.includes('http error') && normalized.includes('500')) {
          title = 'Server Error (500)'
          message = 'The AI API endpoint returned a 500 error. This usually indicates a server configuration issue (e.g., missing or invalid API key, model misconfiguration, or malformed request). Please try again, and if it persists, check server logs and environment variables.'
        }
        if (normalized.includes('network')) {
          title = 'Network Error'
          message = 'A network error occurred while contacting the AI API. Please check your connection and try again.'
        }

        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          setTimeout(() => startProcessing(), 3000); // Retry after 3 seconds
        } else {
          setError({ title, message })
          onProcessingError(rawMessage)
        }
      }
    } finally {
      // Clean up the abort controller
      processingAbortControllerRef.current = null
    }
  }

  const validateAndSanitize = (resume: OptimizedResume): OptimizedResume | null => {
    // Basic validation checks
    if (!resume.header || !resume.summary || !resume.experience || !resume.education) {
      console.error('Validation Error: Missing required sections');
      return null;
    }

    if (typeof resume.header.name !== 'string' || resume.header.name.trim() === '') {
      console.error('Validation Error: Invalid header name');
      return null;
    }

    // Add more validation and sanitization rules as needed

    return resume;
  }

  const retry = () => {
    if (!isMountedRef.current) return
    setHasStarted(false)
    setError(null)
    setProgress(0)
    setCurrentTask('')
    setElapsedTime(0)
    setRetryCount(0)
  }

  useEffect(() => {
    const hasValidResumeContent = resumeText.trim().length > 0 || resumeFile !== null
    const hasValidJobDescription = jobDescription.trim().length > 0
    const hasValidJobTitle = jobTitle.trim().length > 0
    
    if (!hasStarted && !isProcessing && isMountedRef.current && hasValidResumeContent && hasValidJobDescription && hasValidJobTitle) {
      // Auto-start processing when component mounts
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startProcessing()
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [hasStarted, isProcessing, resumeText, resumeFile, jobDescription, jobTitle])

  // Cleanup effect for component unmounting
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false
      
      // Abort any ongoing processing
      if (processingAbortControllerRef.current) {
        processingAbortControllerRef.current.abort('Component unmounted')
        processingAbortControllerRef.current = null
      }
    }
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {error.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            We encountered an error while optimizing your resume. Please try again.
          </p>
        </div>

        <Card className="p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">Error Details:</h3>
            <p className="text-sm text-red-800 dark:text-red-200">{error.message}</p>
          </div>
          
          <div className="text-center">
            <Button onClick={retry} className="mr-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Optimizing Your Resume
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Our AI is analyzing the job requirements and tailoring your resume for maximum impact.
        </p>
        
        {/* Processing Timer */}
        {elapsedTime > 0 && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Processing... {formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Overall Progress */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>{currentTask || 'Preparing...'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="mb-4" />
          </div>

          {/* Processing Steps */}
          <div className="space-y-4">
            {processingSteps.map((step) => {
              const isActive = currentTask === step.title
              const isCompleted = progress >= step.id * 25
              const Icon = step.icon

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : isCompleted
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : isCompleted
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-medium ${
                        isActive || isCompleted
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`text-sm ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : isCompleted
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="animate-spin">
                      <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  {isCompleted && !isActive && (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">🤖 What our AI is doing:</h3>
        <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
          <li>• Analyzing job requirements and identifying key skills</li>
          <li>• Matching your experience with job requirements</li>
          <li>• Optimizing keywords for ATS compatibility</li>
          <li>• Restructuring content for maximum impact</li>
          <li>• Ensuring professional formatting and tone</li>
        </ul>
      </div>
    </div>
  )
}
