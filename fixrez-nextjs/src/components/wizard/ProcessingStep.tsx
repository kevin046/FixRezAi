import { useEffect, useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Progress } from '../ui/progress'
import { Sparkles, Brain, FileText, CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { optimizeResume } from '../../lib/api'
import { logOptimization } from '@/lib/analytics'
import { parseFile } from '../../lib/fileParser'
import type { OptimizedResume } from '../../types/resume'
import type { AIOptions } from '@/types/resume'
import { calculateATSScore, ATSScore } from '@/lib/atsScoring'

interface ProcessingStepProps {
  jobTitle: string
  jobDescription: string
  resumeFile: File | null
  resumeText: string
  isProcessing: boolean
  onProcessingStart: () => void
  onProcessingComplete: (result: OptimizedResume) => void
  onProcessingError: (error: string) => void
  options?: AIOptions
}

export function ProcessingStep({
  jobTitle,
  jobDescription,
  resumeFile,
  resumeText,
  isProcessing,
  onProcessingStart,
  onProcessingComplete,
  onProcessingError,
  options
}: ProcessingStepProps) {
  // Component rendered (reduced logging)

  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState('')
  const [error, setError] = useState<{ title: string; message: string } | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [atsScore, setATSScore] = useState<ATSScore | null>(null)
  
  // Use ref to track component mount status and prevent state updates after unmount
  const isMountedRef = useRef(true)
  const processingAbortControllerRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef<number>(0)
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

  const tokenize = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  }

  const extractKeywords = (jd: string): string[] => {
    const words = tokenize(jd)
    const stop = new Set(['the','and','for','with','a','an','to','of','in','on','at','by','is','are','as','be','or','from','that','this'])
    const counts: Record<string, number> = {}
    for (const w of words) {
      if (w.length < 3 || stop.has(w)) continue
      counts[w] = (counts[w] || 0) + 1
    }
    const sorted = Object.keys(counts).sort((a,b) => counts[b]-counts[a])
    return sorted.slice(0, 25)
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
    startTimeRef.current = Date.now()

    try {
      // Step 1: Parse resume
      if (!isMountedRef.current) return
      setCurrentTask('Parsing Resume')
      setProgress(25)
      
      let extractedText = resumeText
      if (resumeFile) {
        try {
          extractedText = await parseFile(resumeFile)
        } catch (parseError) {
          throw parseError
        }
      }

      // Validate extracted text
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No resume content found. Please upload a valid resume file or paste your resume text.')
      }

      const trimmedText = extractedText.trim();
      if (trimmedText.length < 50) {
        throw new Error('Resume content is too short. Please provide a more detailed resume.')
      }

      // Step 2: Analyze job requirements
      if (!isMountedRef.current) return
      setCurrentTask('Analyzing Job Requirements')
      setProgress(50)

      // Step 3: AI Processing
      if (!isMountedRef.current) return
      setCurrentTask('AI Processing')
      setProgress(75)
      
      const optimizationResult = await optimizeResume({
        jobTitle,
        jobDescription,
        resumeText: trimmedText,
        options
      }, (elapsed) => {
        if (isMountedRef.current) {
          setElapsedTime(elapsed)
        }
      })

      if (!isMountedRef.current) return

      if (optimizationResult.success && optimizationResult.data) {
        const validatedResume = validateAndSanitize(optimizationResult.data as OptimizedResume);
        if (validatedResume) {
          // Compute ATS score using shared scoring util to match ATSRating
          const score = calculateATSScore(validatedResume)
          if (isMountedRef.current) setATSScore(score)

          logOptimization({ id: crypto.randomUUID(), ts: Date.now(), jobTitle, status: 'success', durationSec: Math.floor((Date.now() - startTimeRef.current) / 1000) })
          onProcessingComplete(validatedResume);
        } else {
          throw new Error('AI response validation failed. Retrying...');
        }
      } else {
        logOptimization({ id: crypto.randomUUID(), ts: Date.now(), jobTitle, status: 'error', durationSec: Math.floor((Date.now() - startTimeRef.current) / 1000) })
        throw new Error(optimizationResult.error || 'Optimization failed');
      }
    } catch (err) {
      if (isMountedRef.current) {
        const rawMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        const normalized = rawMessage.toLowerCase()
        let title = 'Processing Failed'
        let message = rawMessage
        if (normalized.includes('http error') && normalized.includes('500')) {
          title = 'Server Error (500)'
          message = 'The AI API endpoint returned a 500 error. Please try again later.'
        }
        if (normalized.includes('network')) {
          title = 'Network Error'
          message = 'A network error occurred while contacting the AI API. Please check your connection and try again.'
        }

        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          setTimeout(() => startProcessing(), 3000)
        } else {
          setError({ title, message })
          onProcessingError(rawMessage)
          logOptimization({ id: crypto.randomUUID(), ts: Date.now(), jobTitle, status: 'error', durationSec: Math.floor((Date.now() - startTimeRef.current) / 1000) })
        }
      }
    } finally {
      processingAbortControllerRef.current = null
    }
  }

  const validateAndSanitize = (resume: OptimizedResume): OptimizedResume | null => {
    if (!resume.header || !resume.summary || !resume.experience || !resume.education) {
      return null;
    }
    if (typeof resume.header.name !== 'string' || resume.header.name.trim() === '') {
      return null;
    }
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
    setATSScore(null)
  }

  useEffect(() => {
    const hasValidResumeContent = resumeText.trim().length > 0 || resumeFile !== null
    const hasValidJobDescription = jobDescription.trim().length > 0
    const hasValidJobTitle = jobTitle.trim().length > 0
    
    if (!hasStarted && !isProcessing && isMountedRef.current && hasValidResumeContent && hasValidJobDescription && hasValidJobTitle) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startProcessing()
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [hasStarted, isProcessing, resumeText, resumeFile, jobDescription, jobTitle])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
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
        
        {elapsedTime > 0 && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Processing... {formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      {atsScore && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300">ATS Compatibility Score</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{atsScore.totalScore}%</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Parse {atsScore.categories.parseRate.score}% • Impact {atsScore.categories.quantifyingImpact.score}% • Repetition {atsScore.categories.repetition.score}% • Spelling & Grammar {atsScore.categories.spellingGrammar.score}%
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Feedback</div>
              <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc pl-5 space-y-1">
                {atsScore.feedback.length > 0 ? atsScore.feedback.map((s, i) => (<li key={i}>{s}</li>)) : (
                  <li>Your resume aligns well with the ATS criteria.</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>{currentTask || 'Preparing...'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="mb-4" />
          </div>

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
