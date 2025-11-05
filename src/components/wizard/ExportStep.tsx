import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Download, FileText, File, Code, CheckCircle, AlertCircle, FileImage } from 'lucide-react'
import { exportAsText, exportAsWord, exportAsJSON } from '../../lib/exportUtils'
import { pdf } from '@react-pdf/renderer'
import { ResumeTemplatePDF } from '../ResumeTemplatePDF'
import type { OptimizedResume } from '../../types/resume'

interface ExportStepProps {
  optimizedResume: OptimizedResume | null
}

export function ExportStep({ optimizedResume }: ExportStepProps) {
  const [exportStatus, setExportStatus] = useState<{[key: string]: 'idle' | 'loading' | 'success' | 'error'}>({})

  if (!optimizedResume) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">No optimized resume available for export.</p>
      </div>
    )
  }

  const handleExport = async (format: 'text' | 'word' | 'json' | 'pdf', filename: string) => {
    setExportStatus(prev => ({ ...prev, [format]: 'loading' }))
    
    try {
      switch (format) {
        case 'text':
          await exportAsText(optimizedResume, filename)
          break
        case 'word':
          await exportAsWord(optimizedResume, filename)
          break
        case 'json':
          await exportAsJSON(optimizedResume, filename)
          break
        case 'pdf':
          try {
            // Validate resume data before PDF generation
            if (!optimizedResume || !optimizedResume.header || !optimizedResume.header.name) {
              throw new Error('Invalid resume data: Missing header information')
            }
            
            const pdfBlob = await pdf(<ResumeTemplatePDF resume={optimizedResume} />).toBlob()
            
            if (!pdfBlob || pdfBlob.size === 0) {
              throw new Error('PDF generation failed: Empty blob created')
            }
            
            const url = URL.createObjectURL(pdfBlob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
          } catch (pdfError) {
            console.error('PDF Export Error:', pdfError)
            // Re-throw with more specific error message
            throw new Error(`PDF Export Failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`)
          }
          break
      }
      
      setExportStatus(prev => ({ ...prev, [format]: 'success' }))
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [format]: 'idle' }))
      }, 3000)
      
    } catch (error) {
      console.error(`Export error (${format}):`, error)
      setExportStatus(prev => ({ ...prev, [format]: 'error' }))
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [format]: 'idle' }))
      }, 3000)
    }
  }

  const getButtonContent = (format: string, defaultText: string, icon: React.ReactNode) => {
    const status = exportStatus[format]
    
    switch (status) {
      case 'loading':
        return (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Exporting...
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Downloaded!
          </>
        )
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Try Again
          </>
        )
      default:
        return (
          <>
            {icon}
            {defaultText}
          </>
        )
    }
  }

  const exportOptions = [
    {
      id: 'pdf',
      title: 'PDF Document (.pdf)',
      description: 'Professional template format, ready to submit',
      icon: <FileImage className="w-6 h-6" />,
      filename: 'optimized-resume.pdf',
      recommended: true,
      features: ['Professional template', 'ATS-optimized layout', 'Ready to submit']
    },
    {
      id: 'text',
      title: 'Plain Text (.txt)',
      description: 'Simple text format, compatible with all systems',
      icon: <FileText className="w-6 h-6" />,
      filename: 'optimized-resume.txt',
      recommended: false,
      features: ['Universal compatibility', 'Smallest file size', 'Easy to copy/paste']
    },
    {
      id: 'json',
      title: 'JSON-LD (.json)',
      description: 'Structured data format for LinkedIn and modern platforms',
      icon: <Code className="w-6 h-6" />,
      filename: 'optimized-resume.json',
      recommended: false,
      features: ['LinkedIn compatible', 'Machine readable', 'Future-proof format']
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Export Your Optimized Resume
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose your preferred format and download your AI-optimized resume. You can export in multiple formats for different use cases.
        </p>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {exportOptions.map((option) => (
          <Card key={option.id} className={`relative ${option.recommended ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}>
            {option.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
            )}
            
            <CardHeader className="text-center space-y-1">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                option.recommended 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}>
                {option.icon}
              </div>
              <CardTitle className="text-lg">{option.title}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {option.description}
              </p>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2 mb-4">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button
                onClick={() => handleExport(option.id as any, option.filename)}
                disabled={exportStatus[option.id] === 'loading'}
                className={`w-full ${
                  option.recommended 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : ''
                }`}
                variant={option.recommended ? 'default' : 'outline'}
              >
                {getButtonContent(option.id, `Download ${option.title.split(' ')[0]}`, <Download className="w-4 h-4 mr-2" />)}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Success Message */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
            🎉 Congratulations!
          </h3>
          <p className="text-green-800 dark:text-green-200 mb-4">
            Your resume has been successfully optimized with AI. You're now ready to apply for jobs with confidence!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm text-green-800 dark:text-green-200">
            <div>
              <h4 className="font-medium mb-2">✨ What we've improved:</h4>
              <ul className="space-y-1 text-left">
                <li>• Optimized keywords for ATS systems</li>
                <li>• Tailored content to job requirements</li>
                <li>• Enhanced professional formatting</li>
                <li>• Improved readability and impact</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚀 Next steps:</h4>
              <ul className="space-y-1 text-left">
                <li>• Review the optimized content</li>
                <li>• Customize for specific applications</li>
                <li>• Update your LinkedIn profile</li>
                <li>• Start applying with confidence!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
