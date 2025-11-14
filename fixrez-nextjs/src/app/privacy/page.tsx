import SEO from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <>
      <SEO 
        title="Privacy Policy - FixRez AI"
        description="Learn how FixRez AI collects, uses, and protects your personal information."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Last updated: January 1, 2024
            </p>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <CardDescription>
                This Privacy Policy describes how FixRez AI ("we", "us", or "our") collects, uses, and protects your personal information when you use our service.
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              <h2>1. Information We Collect</h2>
              <h3>Personal Information</h3>
              <p>
                We collect personal information that you provide to us, such as:
              </p>
              <ul>
                <li>Name and email address (when you create an account)</li>
                <li>Resume content and job descriptions (when you use our optimization service)</li>
                <li>Contact information (when you contact us)</li>
                <li>Payment information (if you purchase premium features)</li>
              </ul>

              <h3>Automatically Collected Information</h3>
              <p>
                When you use our service, we automatically collect:
              </p>
              <ul>
                <li>Device information (browser type, operating system)</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>IP address and location data</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>
                We use your information to:
              </p>
              <ul>
                <li>Provide and improve our AI-powered resume optimization service</li>
                <li>Process and analyze resume content for optimization suggestions</li>
                <li>Send you service-related communications</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Monitor and analyze usage patterns to improve our service</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2>3. Data Processing and AI</h2>
              <p>
                Our service uses artificial intelligence to analyze and optimize resume content. When you upload your resume:
              </p>
              <ul>
                <li>Your resume content is processed by our AI systems</li>
                <li>We may store processed versions of your content to improve our AI models</li>
                <li>Your data is used to generate personalized optimization suggestions</li>
                <li>We implement measures to protect your privacy during AI processing</li>
              </ul>

              <h2>4. Data Sharing and Disclosure</h2>
              <p>
                We do not sell your personal information. We may share your information with:
              </p>
              <ul>
                <li><strong>Service Providers:</strong> Third-party vendors who help us operate our service (e.g., hosting, analytics, email delivery)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our legal rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>

              <h2>5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information, including:
              </p>
              <ul>
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and monitoring</li>
                <li>Staff training on data protection</li>
              </ul>

              <h2>6. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.
              </p>

              <h2>7. Your Rights</h2>
              <p>
                Depending on your location, you may have the right to:
              </p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Object to processing of your information</li>
                <li>Request data portability</li>
                <li>Opt-out of marketing communications</li>
              </ul>

              <h2>8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own, including the United States. We ensure appropriate safeguards are in place for such transfers.
              </p>

              <h2>9. Children's Privacy</h2>
              <p>
                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>

              <h2>10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>

              <h2>11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <p>
                <strong>Email:</strong> privacy@fixrez.ai<br />
                <strong>Address:</strong> FixRez AI, Privacy Office<br />
                <strong>Website:</strong> https://fixrez.ai
              </p>

              <h2>12. California Privacy Rights</h2>
              <p>
                California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and how we use it.
              </p>

              <h2>13. GDPR Compliance</h2>
              <p>
                For users in the European Union, we comply with the General Data Protection Regulation (GDPR). Our legal basis for processing includes consent, contract performance, and legitimate interests.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}