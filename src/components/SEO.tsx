import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    canonical?: string;
    type?: string;
    name?: string;
    image?: string;
}

export const SEO = ({
    title,
    description,
    canonical,
    type = 'website',
    name = 'FixRez AI',
    image = 'https://www.fixrez.com/fixrez-icon.svg'
}: SEOProps) => {
    const siteTitle = 'FixRez AI - Professional Resume Optimization Tool';
    const siteDescription = 'FixRez AI helps job seekers optimize resumes with advanced AI technology. Get past ATS systems, improve your resume score, and land more interviews.';
    const siteUrl = 'https://www.fixrez.com';

    const fullTitle = title ? `${title} | ${name}` : siteTitle;
    const fullDescription = description || siteDescription;
    const fullCanonical = canonical ? `${siteUrl}${canonical}` : siteUrl;

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={fullDescription} />
            <link rel="canonical" href={fullCanonical} />

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={fullDescription} />
            <meta property="og:type" content={type} />
            <meta property="og:url" content={fullCanonical} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={name} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={fullDescription} />
            <meta name="twitter:image" content={image} />
        </Helmet>
    );
};
