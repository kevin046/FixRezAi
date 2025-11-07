import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Download, FileText, Code, CheckCircle, AlertCircle, FileImage } from 'lucide-react'
import { exportAsText, exportAsJSON, exportLinkedInSummary, trackExport } from '../../lib/exportUtils'
import { logExport } from '@/lib/analytics'
import { pdf } from '@react-pdf/renderer'
import { ResumeTemplatePDF } from '../ResumeTemplatePDF'
import type { OptimizedResume } from '../../types/resume'

interface ExportStepProps {
  optimizedResume: OptimizedResume | null
}

export function ExportStep({ optimizedResume }: ExportStepProps) {
  const [exportStatus, setExportStatus] = useState<{[key: string]: 'idle' | 'loading' | 'success' | 'error'}>({})
  const [template, setTemplate] = useState<'modern' | 'classic' | 'executive'>('modern')

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

  const handleExport = async (format: 'text' | 'json' | 'pdf' | 'linkedin', filename: string) => {
    setExportStatus(prev => ({ ...prev, [format]: 'loading' }))
    
    try {
      switch (format) {
        case 'text':
          await exportAsText(optimizedResume, filename)
          trackExport('text', template)
          logExport({ id: crypto.randomUUID(), ts: Date.now(), format: 'text', template })
          break
        case 'json':
          await exportAsJSON(optimizedResume, filename)
          trackExport('json', template)
          logExport({ id: crypto.randomUUID(), ts: Date.now(), format: 'json', template })
          break
        case 'pdf':
          try {
            if (!optimizedResume || !optimizedResume.header || !optimizedResume.header.name) {
              throw new Error('Invalid resume data: Missing header information')
            }
            const pdfBlob = await pdf(<ResumeTemplatePDF resume={optimizedResume as any} template={template} />).toBlob()
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
            trackExport('pdf', template)
            logExport({ id: crypto.randomUUID(), ts: Date.now(), format: 'pdf', template })
          } catch (pdfError) {
            console.error('PDF Export Error:', pdfError)
            throw new Error(`PDF export failed: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`)
          }
          break
        case 'linkedin':
          await exportLinkedInSummary(optimizedResume, filename)
          trackExport('linkedin', template)
          logExport({ id: crypto.randomUUID(), ts: Date.now(), format: 'linkedin', template })
          break
      }

      setExportStatus(prev => ({ ...prev, [format]: 'success' }))
    } catch (error) {
      console.error('Export Error:', error)
      setExportStatus(prev => ({ ...prev, [format]: 'error' }))
    } finally {
      setTimeout(() => setExportStatus(prev => ({ ...prev, [format]: 'idle' })), 1500)
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
    },
    {
      id: 'linkedin',
      title: 'LinkedIn Summary (.txt)',
      description: 'Concise profile-ready About section with skills',
      icon: <FileText className="w-6 h-6" />,
      filename: 'linkedin-summary.txt',
      recommended: false,
      features: ['Profile-ready About', 'Includes skills list', 'Length-safe (~2200 chars)']
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

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant={template==='modern'? 'default':'outline'} onClick={() => setTemplate('modern')}>Modern</Button>
            <Button variant={template==='classic'? 'default':'outline'} onClick={() => setTemplate('classic')}>Classic</Button>
            <Button variant={template==='executive'? 'default':'outline'} onClick={() => setTemplate('executive')}>Executive</Button>
          </div>
        </CardContent>
      </Card>

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
              <div className="space-y-4">
                <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
                  {option.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>

                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => handleExport(option.id as any, option.filename)}
                    disabled={exportStatus[option.id] === 'loading'}
                  >
                    {exportStatus[option.id] === 'loading' ? 'Exporting...' : 'Download'}
                  </Button>
                  {exportStatus[option.id] === 'success' && (
                    <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Exported
                    </div>
                  )}
                  {exportStatus[option.id] === 'error' && (
                    <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Error
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
