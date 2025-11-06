import { OptimizationRequest, OptimizationResponse } from '@/types/resume';
import { supabase } from '@/lib/supabase'

const OPTIMIZATION_PROMPT = `
You are a world-class resume writer and career coach with a deep understanding of Applicant Tracking Systems (ATS). Your mission is to transform a user's resume into a powerful, professional, and ATS-optimized document that significantly increases their chances of landing an interview.

**Core Directives:**
1.  **ATS Optimization:** Structure the entire resume to be easily parsable by ATS. Use standard, universally recognized section headers (e.g., 'Professional Experience', 'Education').
2.  **Professional Language:** Elevate the language of the resume. Replace weak phrases with strong, action-oriented verbs and impactful, quantifiable achievements.
3.  **Job Alignment:** Meticulously align the resume with the target job description. Weave in relevant keywords and skills naturally throughout the document.
4.  **Clarity and Conciseness:** Ensure the resume is clear, concise, and easy to read. Every word should have a purpose.

**Target Job:** {jobTitle}
**Job Description:** {jobDescription}
**User Resume:** {resumeText}

**JSON Output Structure:**
Return ONLY a valid JSON object in the following format, using the data extracted and enhanced from the resume:

{
  "header": {
    "name": "[Full Name]",
    "contact": "[City, Province | Email | Phone | LinkedIn Profile URL (if available)]"
  },
  "summary": "[A 2-3 sentence professional summary tailored to the target job, highlighting key qualifications and achievements.]",
  "experience": [
    {
      "company": "[Company Name]",
      "location": "[City, Province]",
      "dates": "[MMM YYYY - MMM YYYY]",
      "title": "[Job Title]",
      "bullets": [
        "[Achievement with quantifiable impact and relevant keywords]",
        "[Use strong action verbs and measurable outcomes]"
      ]
    }
  ],
  "education": [
    {
      "school": "[School Name]",
      "location": "[City, Province]",
      "dates": "[Year - Year]",
      "degree": "[Degree or Diploma]"
    }
  ],
  "additional": {
    "technical_skills": "[A comma-separated list of technical skills relevant to the job]",
    "languages": "[Languages spoken]",
    "certifications": "[Certifications relevant to the target job]",
    "awards": "[A comma-separated list of relevant awards or recognitions.]"
  }
}
`;

export async function optimizeResume(
  request: OptimizationRequest, 
  onProgress?: (elapsed: number) => void
): Promise<OptimizationResponse> {
  console.log('🚀 API: Starting resume optimization with request:', {
    jobTitle: request.jobTitle,
    jobDescriptionLength: request.jobDescription.length,
    resumeTextLength: request.resumeText.length,
    resumeTextPreview: request.resumeText.substring(0, 300) + '...'
  });

  // Validate input data before making API call
  if (!request.jobTitle || request.jobTitle.trim().length === 0) {
    console.error('❌ API: Missing job title');
    return {
      success: false,
      error: 'Job title is required for resume optimization.'
    };
  }

  if (!request.jobDescription || request.jobDescription.trim().length < 20) {
    console.error('❌ API: Job description too short or missing');
    return {
      success: false,
      error: 'Job description must be at least 20 characters long.'
    };
  }

  if (!request.resumeText || request.resumeText.trim().length < 50) {
    console.error('❌ API: Resume text too short or missing:', {
      hasResumeText: !!request.resumeText,
      resumeTextLength: request.resumeText?.length || 0,
      trimmedLength: request.resumeText?.trim().length || 0
    });
    return {
      success: false,
      error: 'Resume content must be at least 50 characters long. Please ensure your resume file was properly parsed or paste your resume text manually.'
    };
  }

  // Additional validation for resume content quality
  const trimmedResumeText = request.resumeText.trim();
  const commonResumeKeywords = [
    'experience', 'education', 'skills', 'work', 'employment', 
    'summary', 'objective', 'profile', 'background', 'career',
    'position', 'job', 'role', 'responsibilities', 'achievements',
    'university', 'college', 'degree', 'certification', 'training'
  ];
  
  const lowerResumeText = trimmedResumeText.toLowerCase();
  const hasResumeKeywords = commonResumeKeywords.some(keyword => lowerResumeText.includes(keyword));
  
  if (!hasResumeKeywords) {
    console.warn('⚠️ API: Resume text may not contain typical resume content:', {
      textLength: trimmedResumeText.length,
      preview: trimmedResumeText.substring(0, 200) + '...'
    });
  }

  console.log('✅ API: Input validation passed, proceeding with optimization');

  let controller: AbortController | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let progressInterval: NodeJS.Timeout | null = null;
  
  try {
    // Removed startup log to reduce console spam

    // Create AbortController with extended timeout for AI processing
    controller = new AbortController();
    
    // Increased timeout to 180 seconds (3 minutes) for AI processing
    timeoutId = setTimeout(() => {
      // Only log timeout errors, not regular progress
      console.log('⏱️ Request timeout reached (180s), aborting...');
      if (controller && !controller.signal.aborted) {
        controller.abort('Request timeout after 180 seconds');
      }
    }, 180000);

    // Starting AI optimization (reduced logging)

    // Start timer for progress tracking
    const startTime = Date.now();
    
    if (onProgress) {
      progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        // Removed console logging to eliminate spam - only call progress callback
        onProgress(elapsed);
      }, 1000);
    }

    // Add signal abort listener for debugging
    controller.signal.addEventListener('abort', () => {
      // Removed debug log to reduce console spam
    });

    // Determine API base:
    // 1) Use env var if present
    // 2) Use window.__VITE_API_BASE_URL if provided by index.html
    // 3) In localhost, use canonical domain + '/api'
    // 4) In production, use current origin + '/api'
    // 5) Fallback to same-origin '/api/optimize'
    let apiBase = ''
    try {
      const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined
      const winBase = typeof window !== 'undefined' ? (window as any).__VITE_API_BASE_URL as string | undefined : undefined
      const selectedBase = envBase || winBase
      if (selectedBase && selectedBase.length > 0) {
        apiBase = selectedBase.replace(/\/$/, '')
      } else if (typeof window !== 'undefined') {
        const host = window.location.hostname
        const isLocal = host === 'localhost' || host === '127.0.0.1'
        if (isLocal) {
          const canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
          const canonicalOrigin = canonicalEl?.href ? new URL(canonicalEl.href).origin : null
          if (canonicalOrigin) {
            apiBase = `${canonicalOrigin}/api`.replace(/\/$/, '')
          }
        } else {
          apiBase = `${window.location.origin}/api`.replace(/\/$/, '')
        }
      }
    } catch { /* no-op */ }
    const url = apiBase ? `${apiBase}/optimize` : '/api/optimize'
    console.log('🔧 API base resolved:', { apiBase, url })

    // Attach Supabase access token for server-side verification
    let accessToken: string | undefined
    try {
      const { data: { session } } = await supabase.auth.getSession()
      accessToken = session?.access_token
    } catch (e) {
      console.warn('⚠️ Unable to retrieve Supabase session for API call:', e)
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    // Making fetch request to optimize endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jobTitle: request.jobTitle,
        jobDescription: request.jobDescription,
        resumeText: request.resumeText
      }),
      signal: controller.signal, // Add abort signal
    });

    // Response received (reduced logging)

    // Clear all timers and intervals on successful completion
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    if (!response.ok) {
      console.error('❌ HTTP error response:', response.status, response.statusText, 'URL:', url);
      
      // Try to extract the user-friendly error message from the response body
      try {
        const errorData = await response.json();
        const details = errorData.details ? ` Details: ${errorData.details}` : ''
        if (errorData.error) {
          throw new Error(`${errorData.error}.${details}`.trim());
        }
      } catch (jsonError) {
        // If we can't parse JSON, fall back to generic error
        console.warn('Could not parse error response as JSON:', jsonError);
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ AI optimization completed successfully!');
    
    // 🔍 RAW AI RESPONSE DEBUGGING
    console.log('🔍 API: RAW AI Response (complete):', JSON.stringify(data, null, 2));
    console.log('🔍 API: Response structure analysis:', {
      hasSuccess: 'success' in data,
      successValue: data.success,
      hasData: 'data' in data,
      dataType: typeof data.data,
    });

    // Validate the response structure
    if (data.success && data.data) {
      return {
        success: true,
        data: data.data
      };
    } else {
      console.error('❌ Response validation failed:', data);
      return {
        success: false,
        error: data.error || 'Invalid response structure'
      };
    }
  } catch (error) {
    console.error('💥 Optimization error:', error);
    
    // Cleanup on error
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    // Handle specific abort errors with better identification
    if (error instanceof Error && error.name === 'AbortError') {
      const reason = controller?.signal.reason || 'Unknown reason';
      console.log('🚫 Request was aborted:', reason);
      
      // Check if it was a timeout or other abort reason
      if (reason.includes('timeout') || reason.includes('180 seconds')) {
        return {
          success: false,
          error: '⏱️ Request timed out after 3 minutes. AI processing is taking longer than expected. Please try again or check your connection.'
        };
      } else {
        return {
          success: false,
          error: '🚫 Request was cancelled. This may be due to navigation or component unmounting. Please try again.'
        };
      }
    }
    
    // Handle network errors
    if (error instanceof Error && error.message.includes('fetch')) {
      return {
        success: false,
        error: '🌐 Network error occurred. Please check your connection and try again.'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to optimize resume'
    };
  }
}
