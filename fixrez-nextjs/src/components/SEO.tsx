import { Metadata } from 'next';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  noindex?: boolean;
}

export default function SEO({ 
  title = 'FixRez AI - AI-Powered Content Optimization',
  description = 'Transform your content with AI-powered optimization. Create engaging, SEO-friendly content that resonates with your audience and drives results.',
  keywords = 'AI content optimization, SEO, content creation, artificial intelligence, content improvement, writing assistant',
  ogImage = '/og-image.png',
  noindex = false
}: SEOProps) {
  const siteTitle = title.includes('FixRez AI') ? title : `${title} | FixRez AI`;

  return (
    <>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="FixRez AI" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
    </>
  );
}