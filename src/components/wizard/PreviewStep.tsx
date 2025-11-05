import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Eye, Edit3, Save, RotateCcw } from 'lucide-react'
import { OptimizedResume } from '@/types/resume'

interface PreviewStepProps {
  optimizedResume: OptimizedResume | null
  onOptimizedResumeChange: (resume: OptimizedResume | null) => void
}

export function PreviewStep({ optimizedResume, onOptimizedResumeChange }: PreviewStepProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [activeSection, setActiveSection] = useState<'header' | 'summary' | 'experience' | 'education' | 'additional'>('header')

  if (!optimizedResume) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No optimized resume available.</p>
      </div>
    )
  }

  const startEditing = (section: keyof OptimizedResume) => {
    setIsEditing(true)
    setActiveSection(section as any)
    
    if (section === 'header') {
      const headerText = `${optimizedResume.header.name}\n${optimizedResume.header.contact}`
      setEditedContent(headerText)
    } else if (section === 'summary') {
      setEditedContent(optimizedResume.summary)
    } else if (section === 'experience') {
      const experienceText = optimizedResume.experience && optimizedResume.experience.length > 0 
        ? optimizedResume.experience.map(exp => 
            `${exp.company} | ${exp.location} | ${exp.dates}\n${exp.title}\n${exp.bullets ? exp.bullets.map(bullet => `• ${bullet}`).join('\n') : ''}`
          ).join('\n\n')
        : ''
      setEditedContent(experienceText)
    } else if (section === 'education') {
      const educationText = optimizedResume.education && optimizedResume.education.length > 0
        ? optimizedResume.education.map(edu => 
            `${edu.school} | ${edu.location} | ${edu.dates}\n${edu.degree}${edu.bullets ? '\n' + edu.bullets.map(bullet => `• ${bullet}`).join('\n') : ''}`
          ).join('\n\n')
        : ''
      setEditedContent(educationText)
    } else if (section === 'additional') {
      const additionalText = optimizedResume.additional
        ? [
            optimizedResume.additional.technical_skills ? `Technical Skills: ${optimizedResume.additional.technical_skills}` : '',
            optimizedResume.additional.languages ? `Languages: ${optimizedResume.additional.languages}` : '',
            optimizedResume.additional.certifications ? `Certifications: ${optimizedResume.additional.certifications}` : '',
            optimizedResume.additional.awards ? `Awards: ${optimizedResume.additional.awards}` : ''
          ].filter(Boolean).join('\n')
        : ''
      setEditedContent(additionalText)
    }
  }

  const saveEdit = () => {
    if (optimizedResume) {
      let updatedValue: any = editedContent
      
      if (activeSection === 'header') {
        const lines = editedContent.split('\n').filter(line => line.trim())
        updatedValue = {
          name: lines[0] || '',
          contact: lines[1] || ''
        }
      } else if (activeSection === 'summary') {
        updatedValue = editedContent
      }
      
      const updated = {
        ...optimizedResume,
        [activeSection]: updatedValue
      }
      onOptimizedResumeChange(updated)
    }
    setIsEditing(false)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditedContent('')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Preview Your Optimized Resume
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Review the AI-optimized content and make any final adjustments before exporting.
        </p>
      </div>

      {/* Resume Sections */}
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Header Information</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('header')}
              disabled={isEditing}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing && activeSection === 'header' ? (
              <div className="space-y-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="FIRST LAST&#10;City, Province • email • phone • linkedin"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 uppercase">
                  {optimizedResume.header.name}
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {optimizedResume.header.contact}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Summary */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="uppercase">Professional Summary</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('summary')}
              disabled={isEditing}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing && activeSection === 'summary' ? (
              <div className="space-y-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="A compelling 2-3 sentence professional summary..."
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {optimizedResume.summary}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Experience */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="uppercase">Professional Experience</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('experience')}
              disabled={isEditing}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing && activeSection === 'experience' ? (
              <div className="space-y-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[300px]"
                  placeholder="Company Name | Location | Dates&#10;Job Title&#10;• Bullet point 1&#10;• Bullet point 2"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {optimizedResume.experience && optimizedResume.experience.length > 0 ? (
                  optimizedResume.experience.map((exp, index) => (
                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1">
                        <h4 className="font-bold text-gray-900 dark:text-white uppercase">
                          {exp.company}
                        </h4>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {exp.location}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1">
                        <h5 className="font-medium text-gray-800 dark:text-gray-200 italic">
                          {exp.title}
                        </h5>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {exp.dates}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {exp.bullets && exp.bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="text-sm text-gray-700 dark:text-gray-300 flex">
                            <span className="mr-2">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No experience data available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="uppercase">Education</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('education')}
              disabled={isEditing}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing && activeSection === 'education' ? (
              <div className="space-y-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="School Name | Location | Dates&#10;Degree Name&#10;• Award or achievement (optional)"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {optimizedResume.education && optimizedResume.education.length > 0 ? (
                  optimizedResume.education.map((edu, index) => (
                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1">
                        <h4 className="font-bold text-gray-900 dark:text-white uppercase">
                          {edu.school}
                        </h4>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {edu.location}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1">
                        <h5 className="font-medium text-gray-800 dark:text-gray-200">
                          {edu.degree}
                        </h5>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {edu.dates}
                        </span>
                      </div>
                      {edu.bullets && edu.bullets.length > 0 && (
                        <ul className="space-y-1">
                          {edu.bullets.map((bullet, bulletIndex) => (
                            <li key={bulletIndex} className="text-sm text-gray-700 dark:text-gray-300 flex">
                              <span className="mr-2">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No education data available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="uppercase">Additional Information</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing('additional')}
              disabled={isEditing}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing && activeSection === 'additional' ? (
              <div className="space-y-4">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Technical Skills: Java, Python, etc.&#10;Languages: English, French, etc.&#10;Certifications: AWS, etc.&#10;Awards: Award name, etc."
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {optimizedResume.additional && optimizedResume.additional.technical_skills && (
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">Technical Skills: </span>
                    <span className="text-gray-700 dark:text-gray-300">{optimizedResume.additional.technical_skills}</span>
                  </div>
                )}
                {optimizedResume.additional && optimizedResume.additional.languages && (
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">Languages: </span>
                    <span className="text-gray-700 dark:text-gray-300">{optimizedResume.additional.languages}</span>
                  </div>
                )}
                {optimizedResume.additional && optimizedResume.additional.certifications && (
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">Certifications: </span>
                    <span className="text-gray-700 dark:text-gray-300">{optimizedResume.additional.certifications}</span>
                  </div>
                )}
                {optimizedResume.additional && optimizedResume.additional.awards && (
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">Awards: </span>
                    <span className="text-gray-700 dark:text-gray-300">{optimizedResume.additional.awards}</span>
                  </div>
                )}
                {optimizedResume.additional && !optimizedResume.additional.technical_skills && !optimizedResume.additional.languages && !optimizedResume.additional.certifications && !optimizedResume.additional.awards && (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No additional information available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
