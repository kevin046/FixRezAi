'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

export default function OptimizePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationType, setOptimizationType] = useState<'seo' | 'engagement' | 'clarity'>('seo');

  // Redirect if not authenticated or not verified
  if (!session) {
    router.push('/auth');
    return null;
  }

  if (!session.user.verified) {
    router.push('/verify');
    return null;
  }

  const handleOptimize = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to optimize');
      return;
    }

    setIsOptimizing(true);
    
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          type: optimizationType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Optimization failed');
      }

      setOptimizedText(data.optimized_text || data.optimizedText);
      toast.success('Content optimized successfully!');
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Optimization failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(optimizedText);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([optimizedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-content-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded!');
  };

  const handleClear = () => {
    setInputText('');
    setOptimizedText('');
  };

  const getOptimizationDescription = () => {
    switch (optimizationType) {
      case 'seo':
        return 'Optimize for search engines with keyword integration and meta improvements';
      case 'engagement':
        return 'Enhance engagement with compelling language and call-to-actions';
      case 'clarity':
        return 'Improve clarity and readability with better structure and flow';
      default:
        return 'Select an optimization type';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SEO 
        title="Optimize Content" 
        description="AI-powered content optimization for better engagement and SEO performance."
      />
      <Navigation />
      
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              AI Content Optimization
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Transform your content with our advanced AI optimization engine. Improve SEO, engagement, and clarity with just one click.
            </p>
          </div>

          {/* Optimization Type Selector */}
          <div className="flex justify-center mb-8">
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
              {[
                { key: 'seo', label: 'SEO', icon: '🔍' },
                { key: 'engagement', label: 'Engagement', icon: '💫' },
                { key: 'clarity', label: 'Clarity', icon: '✨' }
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => setOptimizationType(type.key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    optimizationType === type.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center mb-8">
            <p className="text-gray-600 dark:text-gray-300">
              {getOptimizationDescription()}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>Original Content</CardTitle>
                <CardDescription>
                  Paste your content here to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your content here... You can paste articles, blog posts, product descriptions, or any text you want to optimize."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[300px] resize-none"
                  disabled={isOptimizing}
                />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {inputText.length} characters
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                      disabled={isOptimizing || !inputText}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      onClick={handleOptimize}
                      disabled={isOptimizing || !inputText.trim()}
                      className="min-w-[120px]"
                    >
                      {isOptimizing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Optimize
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card>
              <CardHeader>
                <CardTitle>Optimized Content</CardTitle>
                <CardDescription>
                  Your AI-optimized content will appear here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {optimizedText ? (
                  <>
                    <Textarea
                      value={optimizedText}
                      readOnly
                      className="min-h-[300px] resize-none bg-gray-50 dark:bg-gray-800"
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {optimizedText.length} characters
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownload}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="min-h-[300px] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Your optimized content will appear here</p>
                      <p className="text-sm mt-2">Click "Optimize" to get started</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tips */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Optimization Tips
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-blue-600 dark:text-blue-400 mb-4">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    SEO Optimization
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Improves search engine rankings with strategic keyword placement, meta descriptions, and structured content.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-green-600 dark:text-green-400 mb-4">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Engagement Boost
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Enhances reader engagement with compelling headlines, persuasive language, and effective call-to-actions.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-purple-600 dark:text-purple-400 mb-4">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Clarity & Readability
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Improves content structure, removes jargon, and enhances overall readability for better comprehension.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}