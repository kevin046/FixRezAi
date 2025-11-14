'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Upload, BarChart3, FileText, ArrowRight, CheckCircle, Star, Users, Zap } from 'lucide-react';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const handleGetStarted = () => {
    if (session) {
      if (session.user.verified) {
        router.push('/optimize');
      } else {
        router.push('/verify');
      }
    } else {
      router.push('/auth');
    }
  };

  const features = [
    {
      icon: <Sparkles className="h-8 w-8 text-blue-600" />,
      title: "AI-Powered Optimization",
      description: "Advanced AI algorithms analyze your resume and provide personalized improvements"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-green-600" />,
      title: "ATS Score Analysis",
      description: "Get detailed feedback on how well your resume passes Applicant Tracking Systems"
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "Industry-Specific Tips",
      description: "Tailored recommendations based on your target industry and role"
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Instant Results",
      description: "Get comprehensive feedback and suggestions in seconds, not hours"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Marketing Manager",
      content: "FixRez AI helped me land 3 interviews in my first week! The ATS optimization tips were game-changing.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Software Engineer",
      content: "The AI suggestions were spot-on. My resume went from being ignored to getting callbacks consistently.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "HR Professional",
      content: "As someone who reviews resumes, I can say FixRez AI's recommendations align perfectly with what employers want to see.",
      rating: 5
    }
  ];

  return (
    <>
      <SEO />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation />
        
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <div className="bg-blue-600 dark:bg-blue-500 p-4 rounded-full">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Transform Your Resume with{' '}
                <span className="text-blue-600 dark:text-blue-400">AI-Powered</span>
                <br />
                Optimization
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Get ATS-friendly resume improvements, personalized suggestions, and land more interviews with our advanced AI technology. Join thousands of job seekers who've transformed their career prospects.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="text-lg px-8 py-6"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => router.push('/contact')}
                  className="text-lg px-8 py-6"
                >
                  Learn More
                </Button>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-16">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-600 dark:text-gray-300">100% Free to Try</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-600 dark:text-gray-300">No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-600 dark:text-gray-300">Privacy Protected</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-gray-600 dark:text-gray-300">10,000+ Users</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose FixRez AI?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Advanced AI technology combined with industry expertise
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                What Our Users Say
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Join thousands of satisfied job seekers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <CardDescription className="text-base italic">
                      "{testimonial.content}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-600 dark:bg-blue-700">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Resume?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of job seekers who've landed their dream jobs with FixRez AI
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={handleGetStarted}
              className="text-lg px-8 py-6"
            >
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}