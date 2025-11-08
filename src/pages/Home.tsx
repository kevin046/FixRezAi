import { Hero } from '@/components/Hero'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

export default function Home() {
  const { user } = useAuthStore()

  useEffect(() => {
    // Update page title and meta description for SEO
    document.title = 'FixRez AI - Professional Resume Optimization Tool | AI-Powered ATS Resume Scanner'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'FixRez AI helps job seekers optimize their resumes with advanced AI technology. ' +
        'Get past ATS systems, improve your resume score, and land more interviews with our ' +
        'professional resume optimization tool. Try our free ATS resume scanner today!'
      )
    }
  }, [])

  return (
    <div className="min-h-screen">
      {/* SEO-Optimized Content Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Main SEO Content */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Professional AI Resume Optimization Tool
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-4xl mx-auto">
              Transform your job search with our AI-powered resume scanner and optimization platform
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              FixRez AI is the leading resume optimization platform that helps job seekers create 
              ATS-friendly resumes tailored to specific job descriptions. Our advanced AI technology 
              analyzes your resume against job requirements and provides actionable insights to 
              improve your chances of landing interviews at top companies.
            </p>
          </div>

          {/* Key Features Section */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                AI-Powered Resume Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our advanced AI algorithms analyze your resume against job descriptions to identify 
                optimization opportunities and improve your ATS compatibility score.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                ATS Resume Scanner
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get instant feedback on how well your resume passes through Applicant Tracking Systems 
                used by major corporations and recruitment agencies.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Job-Specific Optimization
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Tailor your resume for specific job postings with our intelligent optimization 
                suggestions that match your skills to employer requirements.
              </p>
            </div>
          </div>

          {/* SEO Content Expansion */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Why Choose FixRez AI for Resume Optimization?
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Industry-Leading Technology
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Our AI resume optimization tool uses cutting-edge natural language processing 
                  and machine learning algorithms to analyze and improve your resume. We stay 
                  updated with the latest ATS systems and recruitment trends.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Proven Results
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Job seekers using FixRez AI report up to 3x more interview callbacks. 
                  Our optimized resumes consistently outperform standard applications in 
                  competitive job markets.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Comprehensive Support
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Beyond resume optimization, we provide detailed feedback, cover letter 
                  suggestions, and interview preparation tips. Our platform supports your 
                  entire job search journey.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  User-Friendly Experience
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Our intuitive interface makes resume optimization simple and efficient. 
                  Upload your resume, paste job descriptions, and receive instant optimization 
                  recommendations with clear explanations.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Optimize Your Resume?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Join thousands of job seekers who have improved their interview rates with FixRez AI
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={user ? "/optimize" : "/auth?mode=register"}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
              >
                Start Optimizing Now
              </a>
              <a
                href="/contact"
                className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-full hover:bg-blue-50 transition"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Component Integration */}
      <Hero onGetStarted={() => {}} user={user} onLogout={() => {}} />
    </div>
  )
}