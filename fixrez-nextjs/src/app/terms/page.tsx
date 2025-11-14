import SEO from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <>
      <SEO 
        title="Terms of Service - FixRez AI"
        description="Read our Terms of Service to understand your rights and responsibilities when using FixRez AI."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Last updated: January 1, 2024
            </p>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              <CardDescription>
                Please read these Terms of Service ("Terms") carefully before using FixRez AI ("Service", "we", "us", or "our").
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using FixRez AI, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>

              <h2>2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials (information or software) on FixRez AI's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
              </p>

              <h2>3. Disclaimer</h2>
              <p>
                The materials on FixRez AI's website are provided on an 'as is' basis. FixRez AI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>

              <h2>4. Limitations</h2>
              <p>
                In no event shall FixRez AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on FixRez AI's website.
              </p>

              <h2>5. Accuracy of Materials</h2>
              <p>
                The materials appearing on FixRez AI's website could include technical, typographical, or photographic errors. FixRez AI does not warrant that any of the materials on its website are accurate, complete or current.
              </p>

              <h2>6. Links</h2>
              <p>
                FixRez AI has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by FixRez AI of the site. Use of any such linked website is at the user's own risk.
              </p>

              <h2>7. Modifications</h2>
              <p>
                FixRez AI may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
              </p>

              <h2>8. Governing Law</h2>
              <p>
                These terms and conditions are governed by and construed in accordance with the laws of the United States and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
              </p>

              <h2>9. Service Description</h2>
              <p>
                FixRez AI provides AI-powered resume optimization services. While we strive to provide helpful suggestions, we cannot guarantee job placement or interview success. Results may vary based on individual circumstances, job market conditions, and other factors beyond our control.
              </p>

              <h2>10. User Responsibilities</h2>
              <p>
                Users are responsible for:
              </p>
              <ul>
                <li>Providing accurate and truthful information</li>
                <li>Reviewing and verifying all AI-generated content before use</li>
                <li>Maintaining the confidentiality of their account credentials</li>
                <li>Complying with all applicable laws and regulations</li>
                <li>Not using the service for any unlawful or unauthorized purposes</li>
              </ul>

              <h2>11. Data Usage and Privacy</h2>
              <p>
                By using our service, you acknowledge that we process your data in accordance with our Privacy Policy. We implement appropriate security measures to protect your information, but cannot guarantee absolute security.
              </p>

              <h2>12. Service Availability</h2>
              <p>
                We strive to maintain high availability of our service, but do not guarantee uninterrupted access. Service may be temporarily unavailable for maintenance, updates, or due to factors beyond our control.
              </p>

              <h2>13. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p>
                <strong>Email:</strong> support@fixrez.ai<br />
                <strong>Website:</strong> https://fixrez.ai
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}