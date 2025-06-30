// SEO utility functions for Bes3.com

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

// Generate breadcrumb structured data
export const generateBreadcrumbStructuredData = (breadcrumbs: BreadcrumbItem[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
};

// Generate FAQ structured data
export const generateFAQStructuredData = (faqs: FAQItem[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

// Generate product review structured data
export const generateProductReviewStructuredData = (product: {
  name: string;
  description: string;
  image: string;
  brand: string;
  model?: string;
  rating: number;
  reviewCount: number;
  price?: string;
  availability?: string;
  author: string;
  datePublished: string;
  pros: string[];
  cons: string[];
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "Product",
      "name": product.name,
      "description": product.description,
      "image": product.image,
      "brand": {
        "@type": "Brand",
        "name": product.brand
      },
      "model": product.model,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "reviewCount": product.reviewCount,
        "bestRating": 5,
        "worstRating": 1
      },
      "offers": product.price ? {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "USD",
        "availability": product.availability || "https://schema.org/InStock"
      } : undefined
    },
    "author": {
      "@type": "Person",
      "name": product.author
    },
    "datePublished": product.datePublished,
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": product.rating,
      "bestRating": 5,
      "worstRating": 1
    },
    "positiveNotes": product.pros,
    "negativeNotes": product.cons
  };
};

// Generate article structured data
export const generateArticleStructuredData = (article: {
  headline: string;
  description: string;
  image: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  wordCount?: number;
  readingTime?: string;
  category: string;
  tags?: string[];
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.headline,
    "description": article.description,
    "image": {
      "@type": "ImageObject",
      "url": article.image,
      "width": 1200,
      "height": 630
    },
    "author": {
      "@type": "Person",
      "name": article.author,
      "url": `https://bes3.com/author/${article.author.toLowerCase().replace(/\s+/g, '-')}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Bes3.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://bes3.com/logo.png",
        "width": 512,
        "height": 512
      }
    },
    "datePublished": article.datePublished,
    "dateModified": article.dateModified || article.datePublished,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://bes3.com/article/${article.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    },
    "articleSection": article.category,
    "keywords": article.tags?.join(', '),
    "wordCount": article.wordCount,
    "timeRequired": article.readingTime,
    "inLanguage": "en-US"
  };
};

// Generate organization structured data
export const generateOrganizationStructuredData = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Bes3.com",
    "alternateName": "Bes3",
    "url": "https://bes3.com",
    "logo": "https://bes3.com/logo.png",
    "description": "Best tech reviews, expert analysis, and buying guides for 2025. Trusted by millions for unbiased product recommendations.",
    "foundingDate": "2020",
    "founders": [
      {
        "@type": "Person",
        "name": "Bes3 Editorial Team"
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-555-237-8324",
      "contactType": "customer service",
      "email": "contact@bes3.com",
      "availableLanguage": ["English"]
    },
    "sameAs": [
      "https://facebook.com/bes3tech",
      "https://twitter.com/bes3tech",
      "https://youtube.com/bes3tech",
      "https://instagram.com/bes3tech",
      "https://linkedin.com/company/bes3tech"
    ],
    "knowsAbout": [
      "Technology Reviews",
      "Product Analysis",
      "Consumer Electronics",
      "Artificial Intelligence",
      "Smart Home Technology",
      "Mobile Technology",
      "Computer Hardware",
      "Software Reviews",
      "Gaming Technology",
      "Cybersecurity"
    ]
  };
};

// Generate website structured data
export const generateWebsiteStructuredData = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Bes3.com",
    "alternateName": "Bes3",
    "url": "https://bes3.com",
    "description": "Best tech reviews, expert analysis, and buying guides for 2025",
    "publisher": {
      "@type": "Organization",
      "name": "Bes3.com"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://bes3.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Tech Reviews and Buying Guides",
      "description": "Comprehensive collection of technology reviews and buying guides",
      "numberOfItems": 50,
      "itemListOrder": "https://schema.org/ItemListOrderDescending"
    },
    "about": [
      {
        "@type": "Thing",
        "name": "Technology Reviews"
      },
      {
        "@type": "Thing", 
        "name": "Product Comparisons"
      },
      {
        "@type": "Thing",
        "name": "Buying Guides"
      },
      {
        "@type": "Thing",
        "name": "Tech News"
      }
    ],
    "inLanguage": "en-US",
    "copyrightYear": 2025,
    "copyrightHolder": {
      "@type": "Organization",
      "name": "Bes3.com"
    }
  };
};

// SEO meta tag generator
export const generateMetaTags = (page: {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  ogImage?: string;
  noindex?: boolean;
}) => {
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords.join(', '),
    canonical: page.canonicalUrl,
    robots: page.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogTitle: page.title,
    ogDescription: page.description,
    ogImage: page.ogImage || 'https://bes3.com/og-image.jpg',
    ogUrl: page.canonicalUrl,
    twitterTitle: page.title,
    twitterDescription: page.description,
    twitterImage: page.ogImage || 'https://bes3.com/og-image.jpg'
  };
};

// Generate rich snippets for search results
export const generateRichSnippets = (type: 'article' | 'product' | 'review' | 'faq', data: any) => {
  switch (type) {
    case 'article':
      return generateArticleStructuredData(data);
    case 'product':
    case 'review':
      return generateProductReviewStructuredData(data);
    case 'faq':
      return generateFAQStructuredData(data);
    default:
      return null;
  }
};