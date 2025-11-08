'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, FileText, TrendingUp, Users, Sparkles, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import SEO from '@/components/SEO';
import VerificationIndicator from '@/components/VerificationIndicator';

interface DashboardStats {
  totalOptimizations: number;
  successfulOptimizations: number;
  averageScoreImprovement: number;
  recentOptimizations: Array<{
    id: string;
    filename: string;
    score: number;
    created_at: string;
    status: 'completed' | 'processing' | 'failed';
  }>;
}

// Force dynamic rendering to prevent SSR issues with client-side hooks
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalOptimizations: 0,
    successfulOptimizations: 0,
    averageScoreImprovement: 0,
    recentOptimizations: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?redirect=/dashboard');
      return;
    }

    if (session?.user && !session.user.verified) {
      router.push('/verify');
      return;
    }

    if (session?.user) {
      fetchDashboardStats();
    }
  }, [session, status, router]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/user/dashboard-stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('Failed to fetch dashboard stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <SEO 
        title="Dashboard - FixRez AI"
        description="View your resume optimization statistics and recent activity."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome back, {session.user.name?.split(' ')[0] || session.user.email}!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Here's your resume optimization dashboard
            </p>
          </div>

          {/* Verification Status */}
          {!session.user.verified && (
            <div className="mb-6">
              <VerificationIndicator />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Optimizations</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOptimizations}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalOptimizations > 0 
                    ? Math.round((stats.successfulOptimizations / stats.totalOptimizations) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Improvement</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{stats.averageScoreImprovement}%</div>
                <p className="text-xs text-muted-foreground">Score improvement</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push('/optimize')}
                >
                  Optimize Resume
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Optimizations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Optimizations
              </CardTitle>
              <CardDescription>
                Your latest resume optimization activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentOptimizations.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No optimizations yet. Start by uploading your resume!
                  </p>
                  <Button onClick={() => router.push('/optimize')}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Optimizing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentOptimizations.map((optimization) => (
                    <div 
                      key={optimization.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{optimization.filename}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(optimization.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          optimization.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : optimization.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {optimization.status}
                        </span>
                        <span className="text-sm font-medium">
                          {optimization.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => router.push('/optimize')}
              className="gap-2"
            >
              <Sparkles className="h-5 w-5" />
              Optimize New Resume
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => router.push('/settings')}
              className="gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              Account Settings
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}