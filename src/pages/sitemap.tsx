import React, { useState } from "react";
import { useAuthStore } from '@/stores/authStore'
import { 
  Home, 
  LayoutDashboard, 
  Settings, 
  FileText, 
  Shield, 
  Eye, 
  Mail, 
  Users, 
  BarChart3, 
  MapPin, 
  Clock,
  CheckCircle,
  ArrowRight,
  Globe,
  Search,
  Star,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'
 

interface SitemapSection {
  title: string;
  description: string;
  pages: SitemapPage[];
  icon: React.ReactNode;
}

interface SitemapPage {
  title: string;
  url: string;
  description: string;
  lastModified: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  icon: React.ReactNode;
}

const SitemapPage: React.FC = () => {
  const { user } = useAuthStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const displayName = ((user?.user_metadata as { first_name?: string })?.first_name) || user?.email?.split('@')[0]

  const sitemapSections: SitemapSection[] = [
    {
      title: "Main Pages",
      description: "Core website pages accessible to all users",
      icon: <Globe className="w-5 h-5" />,
      pages: [
        {
          title: "Home",
          url: "/",
          description: "AI-powered resume optimization platform - Transform your job applications with intelligent ATS optimization",
          lastModified: "2024-11-14",
          priority: 1.0,
          changeFrequency: "weekly",
          icon: <Home className="w-4 h-4" />
        },
        {
          title: "Contact Us",
          url: "/contact",
          description: "Get in touch with our support team for questions, feedback, or assistance with your resume optimization",
          lastModified: "2024-11-14",
          priority: 0.8,
          changeFrequency: "monthly",
          icon: <Mail className="w-4 h-4" />
        },
        {
          title: "Privacy Policy",
          url: "/privacy",
          description: "Learn how we protect your personal information and maintain your privacy while using our services",
          lastModified: "2024-11-14",
          priority: 0.7,
          changeFrequency: "yearly",
          icon: <Shield className="w-4 h-4" />
        },
        {
          title: "Terms of Service",
          url: "/terms",
          description: "Read our terms and conditions for using the FixRez AI resume optimization platform",
          lastModified: "2024-11-14",
          priority: 0.7,
          changeFrequency: "yearly",
          icon: <FileText className="w-4 h-4" />
        },
        {
          title: "Security",
          url: "/security",
          description: "Discover our security measures and how we protect your data with industry-leading encryption and authentication",
          lastModified: "2024-11-14",
          priority: 0.6,
          changeFrequency: "monthly",
          icon: <Shield className="w-4 h-4" />
        },
        {
          title: "Accessibility",
          url: "/accessibility",
          description: "Our commitment to making FixRez AI accessible to all users, including those with disabilities",
          lastModified: "2024-11-14",
          priority: 0.5,
          changeFrequency: "yearly",
          icon: <Eye className="w-4 h-4" />
        }
      ]
    },
    {
      title: "User Dashboard",
      description: "Personalized user experience and account management",
      icon: <Users className="w-5 h-5" />,
      pages: [
        {
          title: "Dashboard",
          url: "/dashboard",
          description: "Your personalized dashboard showing resume optimization history, analytics, and account overview",
          lastModified: "2024-11-14",
          priority: 0.9,
          changeFrequency: "daily",
          icon: <BarChart3 className="w-4 h-4" />
        },
        {
          title: "Settings",
          url: "/settings",
          description: "Manage your account preferences, privacy settings, notification preferences, and profile information",
          lastModified: "2024-11-14",
          priority: 0.8,
          changeFrequency: "monthly",
          icon: <Settings className="w-4 h-4" />
        },
        {
          title: "Resume Optimization",
          url: "/optimize",
          description: "Upload your resume and get AI-powered optimization suggestions tailored to specific job descriptions",
          lastModified: "2024-11-14",
          priority: 0.9,
          changeFrequency: "weekly",
          icon: <Search className="w-4 h-4" />
        }
      ]
    },
    {
      title: "Authentication & Verification",
      description: "User authentication and email verification system",
      icon: <CheckCircle className="w-5 h-5" />,
      pages: [
        {
          title: "Login",
          url: "/auth?mode=login",
          description: "Secure login page for existing users to access their FixRez AI account and resume optimization tools",
          lastModified: "2024-11-14",
          priority: 0.8,
          changeFrequency: "monthly",
          icon: <Users className="w-4 h-4" />
        },
        {
          title: "Register",
          url: "/auth?mode=register",
          description: "Create a new FixRez AI account to start optimizing your resume with our AI-powered platform",
          lastModified: "2024-11-14",
          priority: 0.8,
          changeFrequency: "monthly",
          icon: <Users className="w-4 h-4" />
        },
        {
          title: "Email Verification",
          url: "/verify",
          description: "Verify your email address to activate your account and access all FixRez AI features",
          lastModified: "2024-11-14",
          priority: 0.6,
          changeFrequency: "monthly",
          icon: <CheckCircle className="w-4 h-4" />
        },
        {
          title: "Verification Status",
          url: "/verified",
          description: "Check your account verification status and manage your email verification settings",
          lastModified: "2024-11-14",
          priority: 0.5,
          changeFrequency: "monthly",
          icon: <CheckCircle className="w-4 h-4" />
        }
      ]
    }
  ]

  const generateXMLSitemap = () => {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const urlsetHeader = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const urlsetFooter = '</urlset>';

    const urls = sitemapSections.flatMap(section => 
      section.pages.map(page => {
        const loc = `https://fixrez.com${page.url}`;
        const lastmod = page.lastModified;
        const changefreq = page.changeFrequency;
        const priority = page.priority.toFixed(1);

        return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
      })
    ).join('\n');

    return `${xmlHeader}\n${urlsetHeader}\n${urls}\n${urlsetFooter}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
                <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FixRez AI</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-gray-700 dark:text-gray-300">
                      Welcome, {displayName}
                    </span>
                    <a
                      href="/"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <Home className="w-4 h-4 inline mr-1" />
                      Home
                    </a>
                    <a
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <LayoutDashboard className="w-4 h-4 inline mr-1" />
                      Dashboard
                    </a>
                    <a
                      href="/settings"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      Settings
                    </a>
                    <LogoutButton className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { window.location.href = '/auth?mode=login' }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => { window.location.href = '/auth?mode=register' }}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>
              <button
                className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70"
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-label="Menu"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden" id="mobile-nav-menu">
            <div className="container mx-auto px-4 pb-4">
              <div className="rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="p-3">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Welcome, {displayName}</span>
                      </div>
                      <a href="/" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><Home className="w-4 h-4" /> Home</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a href="/dashboard" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a href="/settings" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <div className="border-t border-gray-200 dark:border-gray-800" />
                      <LogoutButton className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => { window.location.href = '/auth?mode=login' }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => { window.location.href = '/auth?mode=register' }}
                        className="px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md"
                      >
                        Register
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Website Sitemap</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover all the pages and features available on FixRez AI. Our comprehensive sitemap helps you navigate our AI-powered resume optimization platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span>SEO Optimized</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 text-blue-500 mr-1" />
              <span>Regularly Updated</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span>Search Engine Friendly</span>
            </div>
          </div>
        </div>

        {/* Sitemap Sections */}
        <div className="space-y-12">
          {sitemapSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{section.title}</h2>
                    <p className="text-gray-600 dark:text-gray-300">{section.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {section.pages.map((page, pageIndex) => (
                    <div key={pageIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                            {page.icon}
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{page.title}</h3>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            page.priority >= 0.9 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            page.priority >= 0.7 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            Priority: {page.priority}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{page.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{page.changeFrequency}</span>
                        </div>
                        <div className="flex items-center">
                          <span>Updated: {page.lastModified}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <a
                          href={page.url}
                          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Visit Page
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* XML Sitemap Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
                <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">XML Sitemap</h2>
                <p className="text-gray-600 dark:text-gray-300">Machine-readable sitemap for search engines</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                This XML sitemap helps search engines discover and index all pages on our website:
              </p>
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-gray-700 dark:text-gray-300">
{generateXMLSitemap()}
                </pre>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2">
                  <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">SEO Optimized</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Helps search engines discover all pages</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full mb-2">
                  <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Fresh Content</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Regularly updated with new pages</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-2">
                  <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Priority Weighted</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Important pages get higher priority</p>
              </div>
            </div>
          </div>
        </div>

        {/* SEO Information */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">SEO Benefits</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">For Search Engines</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center"><CheckCircle className="w-3 h-3 text-green-500 mr-2" /> Improved crawlability</li>
                <li className="flex items-center"><CheckCircle className="w-3 h-3 text-green-500 mr-2" /> Better indexation</li>
                <li className="flex items-center"><CheckCircle className="w-3 h-3 text-green-500 mr-2" /> Priority signaling</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">For Users</h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center"><CheckCircle className="w-3 h-3 text-green-500 mr-2" /> Easy navigation</li>
                <li className="flex items-center"><CheckCircle className="w-3 h-3 text-green-500 mr-2" /> Complete overview</li>
                <li className="flex items-center"><CheckCircle className="w-3 h-3 text-green-500 mr-2" /> Quick access</li>
              </ul>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default SitemapPage;
