import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_CONFIG } from '../config/constants';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  structuredData?: object;
  alternateUrls?: { [key: string]: string };
  robots?: string;
  priority?: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
  description = SITE_CONFIG.description,
  keywords = SITE_CONFIG.seo.defaultKeywords,
  canonicalUrl = SITE_CONFIG.url,
  ogImage = `${SITE_CONFIG.url}${SITE_CONFIG.media.ogImage}`,
  ogType = 'website',
  article,
  structuredData,
  alternateUrls,
  robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  priority = 0.8,
  changefreq = 'weekly'
}) => {
  const keywordsString = keywords.join(', ');

  // Generate default structured data
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_CONFIG.url}/#website`,
        "url": SITE_CONFIG.url,
        "name": SITE_CONFIG.name,
        "description": SITE_CONFIG.description,
        "publisher": {
          "@id": `${SITE_CONFIG.url}/#organization`
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${SITE_CONFIG.url}/search?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        ],
        "inLanguage": "en-US"
      },
      {
        "@type": "Organization",
        "@id": `${SITE_CONFIG.url}/#organization`,
        "name": SITE_CONFIG.name,
        "url": SITE_CONFIG.url,
        "logo": {
          "@type": "ImageObject",
          "inLanguage": "en-US",
          "@id": `${SITE_CONFIG.url}/#/schema/logo/image/`,
          "url": `${SITE_CONFIG.url}${SITE_CONFIG.media.logo}`,
          "contentUrl": `${SITE_CONFIG.url}${SITE_CONFIG.media.logo}`,
          "width": 512,
          "height": 512,
          "caption": SITE_CONFIG.name
        },
        "image": {
          "@id": `${SITE_CONFIG.url}/#/schema/logo/image/`
        },
        "sameAs": [
          SITE_CONFIG.social.facebook,
          SITE_CONFIG.social.twitter,
          SITE_CONFIG.social.youtube,
          SITE_CONFIG.social.instagram,
          SITE_CONFIG.social.linkedin
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": SITE_CONFIG.contact.phoneNumber,
          "contactType": "customer service",
          "email": SITE_CONFIG.contact.email,
          "availableLanguage": "English"
        },
        "foundingDate": SITE_CONFIG.foundingYear.toString(),
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "San Francisco",
          "addressRegion": "CA",
          "addressCountry": "US"
        }
      }
    ]
  };

  const finalStructuredData = structuredData || defaultStructuredData;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywordsString} />
      <meta name="robots" content={robots} />
      <meta name="author" content={`${SITE_CONFIG.name} Editorial Team`} />
      <meta name="language" content="en-US" />
      <meta name="revisit-after" content="7 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Alternate URLs */}
      {alternateUrls && Object.entries(alternateUrls).map(([lang, url]) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={url} />
      ))}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content={SITE_CONFIG.name} />
      <meta property="og:locale" content="en_US" />
      
      {/* Article specific Open Graph tags */}
      {article && (
        <>
          {article.publishedTime && <meta property="article:published_time" content={article.publishedTime} />}
          {article.modifiedTime && <meta property="article:modified_time" content={article.modifiedTime} />}
          {article.author && <meta property="article:author" content={article.author} />}
          {article.section && <meta property="article:section" content={article.section} />}
          {article.tags && article.tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE_CONFIG.social.twitterHandle} />
      <meta name="twitter:creator" content={SITE_CONFIG.social.twitterHandle} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content={SITE_CONFIG.colors.primary} />
      <meta name="msapplication-TileColor" content={SITE_CONFIG.colors.primary} />
      <meta name="msapplication-TileImage" content={`${SITE_CONFIG.url}/mstile-144x144.png`} />
      <meta name="application-name" content={SITE_CONFIG.name} />
      <meta name="apple-mobile-web-app-title" content={SITE_CONFIG.name} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />
      
      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href={SITE_CONFIG.media.favicon} />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="apple-touch-icon" sizes="180x180" href={SITE_CONFIG.media.appleTouchIcon} />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://images.pexels.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://www.google-analytics.com" />
      
      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="//images.pexels.com" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>
      
      {/* Additional meta tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="format-detection" content="address=no" />
      <meta name="format-detection" content="email=no" />
      
      {/* Cache control */}
      <meta httpEquiv="Cache-Control" content="public, max-age=31536000" />
      
      {/* Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Geo tags */}
      <meta name="geo.region" content="US-CA" />
      <meta name="geo.placename" content="San Francisco" />
      <meta name="geo.position" content="37.7749;-122.4194" />
      <meta name="ICBM" content="37.7749, -122.4194" />
    </Helmet>
  );
};

export default SEOHead;