import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { ArrowLeft, ArrowRight, Twitter, Instagram, Facebook, Linkedin } from 'lucide-react'
import { JobTitleStep } from './wizard/JobTitleStep'
import { JobDescriptionStep } from './wizard/JobDescriptionStep'
import { ResumeUploadStep } from './wizard/ResumeUploadStep'
import { ProcessingStep } from './wizard/ProcessingStep'
import { PreviewStep } from './wizard/PreviewStep'
import { ExportStep } from './wizard/ExportStep'
import type { OptimizedResume } from '../types/resume'
import { useAuthStore } from '@/stores/authStore'
import { isVerified, resendVerification } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { secureLogout } from '@/lib/auth'
import { AIOptionsStep } from './wizard/AIOptionsStep'
import type { AIOptions } from '@/types/resume'
import { useResumeStore } from '@/stores/resumeStore'

interface OptimizationWizardProps {
  onBack: () => void
}

export function OptimizationWizard({ onBack }: OptimizationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { user, logout, hydrated } = useAuthStore()
  const verified = isVerified(user)
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [aiOptions, setAIOptions] = useState<AIOptions>({ tone: 'Professional', industry: 'Tech', style: 'Achievement-focused', atsLevel: 'Advanced' })

  const steps = [
    { id: 1, title: 'Job Title', description: 'What position are you targeting?' },
    { id: 2, title: 'Job Description', description: 'Paste the job posting' },
    { id: 3, title: 'Resume Upload', description: 'Upload your current resume' },
    { id: 4, title: 'AI Options', description: 'Configure AI preferences' },
    { id: 5, title: 'AI Processing', description: 'AI optimizes your resume' },
    { id: 6, title: 'Preview', description: 'Review optimized content' },
    { id: 7, title: 'Export', description: 'Download your resume' }
  ]

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return jobTitle.trim().length > 0
      case 2:
        return jobDescription.trim().length > 50
      case 3:
        return resumeFile !== null || resumeText.trim().length > 100
      case 4:
        return true
      case 5:
        return optimizedResume !== null
      case 6:
        return true
      case 7:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (!canProceed()) return
    // Gate AI processing for unverified accounts
    if (currentStep === 4 && !verified) {
      setResendStatus({ type: 'error', message: 'Please verify your email to use AI optimization.' })
      return
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <JobTitleStep
            jobTitle={jobTitle}
            onJobTitleChange={setJobTitle}
          />
        )
      case 2:
        return (
          <JobDescriptionStep
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
          />
        )
      case 3:
        return (
          <ResumeUploadStep
            resumeFile={resumeFile}
            resumeText={resumeText}
            onResumeFileChange={setResumeFile}
            onResumeTextChange={setResumeText}
          />
        )
      case 4:
        return (
          <AIOptionsStep
            options={aiOptions}
            onOptionsChange={setAIOptions}
          />
        )
      case 5:
        return (
          <ProcessingStep
            jobTitle={jobTitle}
            jobDescription={jobDescription}
            resumeFile={resumeFile}
            resumeText={resumeText}
            isProcessing={isProcessing}
            onProcessingStart={handleProcessingStart}
            onProcessingComplete={handleProcessingComplete}
            onProcessingError={handleProcessingError}
            options={aiOptions}
          />
        )
      case 6:
        return (
          <PreviewStep
            optimizedResume={optimizedResume}
            onOptimizedResumeChange={setOptimizedResume}
          />
        )
      case 7:
        return (
          <ExportStep
            optimizedResume={optimizedResume}
          />
        )
      default:
        return null
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleProcessingStart = () => {
    console.log('🚀 OptimizationWizard: Processing started');
    setIsProcessing(true)
  }

  const { setOptimizedResume: setOptimizedResumeGlobal } = useResumeStore()

  const handleProcessingComplete = (result: OptimizedResume) => {
    console.log('🎯 OptimizationWizard: handleProcessingComplete called with result:', result);
    console.log('📊 Result structure:', {
      hasHeader: !!result.header,
      hasSummary: !!result.summary,
      hasExperience: !!result.experience,
      hasEducation: !!result.education,
      hasAdditional: !!result.additional
    });
    
    const enhancedResume = expandEmployerNames(result);

    setOptimizedResume(enhancedResume)
    // Update global store for ATS Rating and other components
    try { setOptimizedResumeGlobal(enhancedResume) } catch {}

    setIsProcessing(false)
    console.log('🔄 OptimizationWizard: Moving to step 6 (Preview)');
    setCurrentStep(6)
  }

  const expandEmployerNames = (resume: OptimizedResume): OptimizedResume => {
    const acronymMap: { [key: string]: string } = {
      "RBC": "Royal Bank of Canada",
      "CIBC": "Canadian Imperial Bank of Commerce",
    };

    const enhancedExperience = resume.experience.map(exp => ({
      ...exp,
      company: acronymMap[exp.company.toUpperCase()] || exp.company,
    }));

    return {
      ...resume,
      experience: enhancedExperience,
    };
  };

  const handleProcessingError = (error: string) => {
    console.error('❌ OptimizationWizard: Processing error:', error);
    setIsProcessing(false)
  }

  const handleResend = async () => {
    const email = user?.email || ''
    const result = await resendVerification(email)
    setResendStatus({ type: result.success ? 'success' : 'error', message: result.message })
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      onBack()
    }
  }

  const handleLogout = async () => {
    const res = await secureLogout()
    if (res.success) {
      window.location.replace('/?logout=1')
    } else {
      window.location.replace('/?logout_error=1')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Navigation identical to index */}
        <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  aria-label="Go back"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FixRez AI
                </a>
              </div>
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-gray-700 dark:text-gray-300">
                      Welcome, {user.email?.split('@')[0]}
                    </span>
                    <a
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/settings"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      Settings
                    </a>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { window.location.href = '/auth?mode=login' }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => { window.location.href = '/auth?mode=register' }}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Resume Optimization Wizard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Follow these steps to optimize your resume with AI
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>Step {currentStep} of {steps.length}</span>
                <span>{Math.round((currentStep / steps.length) * 100)}% Complete</span>
              </div>
              <Progress value={(currentStep / steps.length) * 100} className="mb-4" />
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`text-center p-2 rounded-lg transition-colors ${
                    step.id === currentStep
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : step.id < currentStep
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs mt-1">{step.description}</div>
                </div>
              ))}
            </div>
        </CardContent>
      </Card>

      {/* Verification Gate Notice */}
      {!verified && (
        <div className="mb-8">
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 p-4">
            <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              Limited Access: Please verify your email to use AI optimization
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              You can fill in your job info and upload a resume, but AI processing is disabled until your account is verified. Check your inbox for the verification link.
            </p>
            <div className="flex items-start sm:items-center">
              <Button onClick={handleResend} variant="outline" className="w-full sm:w-auto">
                Resend Verification Email
              </Button>
            </div>
            {resendStatus && (
              <div className={`mt-2 text-sm ${resendStatus.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {resendStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">
            {steps[currentStep - 1]?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < steps.length && currentStep !== 5 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isProcessing || (!verified && currentStep === 4)}
              className="w-full sm:w-auto"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        
      </div>
    </div>
  )
}
