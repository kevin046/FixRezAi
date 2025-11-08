import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { Upload, FileText, File, AlertCircle, CheckCircle, User } from 'lucide-react'

interface ResumeUploadStepProps {
  resumeFile: File | null
  resumeText: string
  onResumeFileChange: (file: File | null) => void
  onResumeTextChange: (text: string) => void
}

export function ResumeUploadStep({ 
  resumeFile, 
  resumeText, 
  onResumeFileChange, 
  onResumeTextChange 
}: ResumeUploadStepProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text' | 'scratch'>('file')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Personal information state for "Create from Scratch"
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    experience: '',
    education: '',
    skills: ''
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, DOCX, or TXT file.')
      return
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB.')
      return
    }
    
    onResumeFileChange(file)
    setUploadMethod('file')
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const generateResumeFromPersonalInfo = () => {
    const { fullName, email, phone, location, summary, experience, education, skills } = personalInfo
    
    let resumeContent = ''
    
    // Header
    if (fullName) resumeContent += `${fullName}\n`
    const contactInfo = [email, phone, location].filter(Boolean).join(' | ')
    if (contactInfo) resumeContent += `${contactInfo}\n\n`
    
    // Professional Summary
    if (summary) resumeContent += `PROFESSIONAL SUMMARY\n${summary}\n\n`
    
    // Experience
    if (experience) resumeContent += `EXPERIENCE\n${experience}\n\n`
    
    // Education
    if (education) resumeContent += `EDUCATION\n${education}\n\n`
    
    // Skills
    if (skills) resumeContent += `SKILLS\n${skills}\n\n`
    
    return resumeContent.trim()
  }

  const handlePersonalInfoChange = (field: string, value: string) => {
    const updatedInfo = { ...personalInfo, [field]: value }
    setPersonalInfo(updatedInfo)
    
    // Auto-generate resume text when personal info changes
    const generatedResume = generateResumeFromPersonalInfo()
    if (generatedResume !== resumeText) {
      onResumeTextChange(generatedResume)
    }
  }

  const wordCount = resumeText.trim().split(/\s+/).filter(word => word.length > 0).length
  const minWords = 100
  const isTextValid = wordCount >= minWords
  const isFileValid = resumeFile !== null
  const isScratchValid = personalInfo.fullName.trim().length > 0 && 
                        personalInfo.email.trim().length > 0 && 
                        (personalInfo.experience.trim().length > 0 || personalInfo.education.trim().length > 0)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Upload Your Resume
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Upload your current resume or paste the text content. We support PDF, DOCX, and plain text formats.
        </p>
      </div>

      {/* Upload Method Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <Button
            variant={uploadMethod === 'file' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setUploadMethod('file')}
            className="mr-1"
          >
            <File className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          <Button
            variant={uploadMethod === 'text' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setUploadMethod('text')}
            className="mr-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Paste Text
          </Button>
          <Button
            variant={uploadMethod === 'scratch' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setUploadMethod('scratch')}
          >
            <User className="w-4 h-4 mr-2" />
            Create from Scratch
          </Button>
        </div>
      </div>

      {uploadMethod === 'file' ? (
        <Card className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {resumeFile ? (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {resumeFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onResumeFileChange(null)}
                >
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Drop your resume here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supports PDF, DOCX, and TXT files up to 10MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </Card>
      ) : uploadMethod === 'text' ? (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="resume-text" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Resume Content *
              </label>
              <div className={`text-sm ${isTextValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {wordCount} / {minWords} words minimum
              </div>
            </div>
            
            <Textarea
              id="resume-text"
              placeholder="Paste your resume content here...

Example:
John Doe
Software Engineer
john.doe@email.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer | Tech Company | 2020-Present
• Developed and maintained React applications serving 100k+ users
• Led a team of 5 developers in implementing microservices architecture
• Improved application performance by 40% through code optimization

EDUCATION
Bachelor of Science in Computer Science | University Name | 2018
..."
              value={resumeText}
              onChange={(e) => onResumeTextChange(e.target.value)}
              className="min-h-[300px] resize-none"
            />
            
            {!isTextValid && resumeText.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Please provide more resume content (at least {minWords} words) for better optimization results.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Create Resume from Scratch
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Don't have a resume? No problem! Fill in your information below and we'll help you create one.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={personalInfo.fullName}
                  onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@email.com"
                  value={personalInfo.email}
                  onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={personalInfo.phone}
                  onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <Input
                  id="location"
                  placeholder="City, State"
                  value={personalInfo.location}
                  onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Professional Summary
              </label>
              <Textarea
                id="summary"
                placeholder="Brief overview of your professional background, key skills, and career objectives..."
                value={personalInfo.summary}
                onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Work Experience *
              </label>
              <Textarea
                id="experience"
                placeholder="Job Title | Company Name | Dates
• Key achievement or responsibility
• Another achievement with quantifiable results
• Third accomplishment that demonstrates your skills

Previous Job Title | Previous Company | Dates
• Achievement from previous role
• Another accomplishment..."
                value={personalInfo.experience}
                onChange={(e) => handlePersonalInfoChange('experience', e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div>
              <label htmlFor="education" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Education *
              </label>
              <Textarea
                id="education"
                placeholder="Degree | University/School Name | Year
• Relevant coursework, honors, or achievements
• GPA (if 3.5 or higher)
• Relevant projects or activities"
                value={personalInfo.education}
                onChange={(e) => handlePersonalInfoChange('education', e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Skills & Technologies
              </label>
              <Textarea
                id="skills"
                placeholder="Technical Skills: Programming languages, software, tools
Soft Skills: Leadership, communication, problem-solving
Certifications: Any relevant certifications or licenses"
                value={personalInfo.skills}
                onChange={(e) => handlePersonalInfoChange('skills', e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {!isScratchValid && (personalInfo.fullName || personalInfo.email || personalInfo.experience || personalInfo.education) && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Please fill in your name, email, and at least one of experience or education to continue.
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Tips for Success:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Use action verbs and quantify your achievements when possible</li>
                <li>• Focus on results and impact rather than just job duties</li>
                <li>• Keep descriptions concise but informative</li>
                <li>• Our AI will help optimize and format your content professionally</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">🔒 Privacy & Security:</h3>
        <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
          <li>• Your resume is processed securely and never stored permanently</li>
          <li>• All data is encrypted during transmission</li>
          <li>• Files are automatically deleted after processing</li>
          <li>• We never share your information with third parties</li>
        </ul>
      </div>
    </div>
  )
}