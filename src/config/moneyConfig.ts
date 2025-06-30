export interface MoneyArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  category: string;
  featured?: boolean;
  savings?: string;
  rating?: number;
}

export const MONEY_ARTICLES: MoneyArticle[] = [
  {
    id: 'best-high-yield-savings-accounts-6-percent-apy-2025',
    slug: 'best-high-yield-savings-accounts-6-percent-apy-2025',
    title: 'Best High-Yield Savings Accounts 2025: 6% APY Options Available',
    excerpt: 'Top savings accounts offering 6%+ annual percentage yield in 2025, with expert analysis of terms and conditions.',
    readTime: '8 min',
    category: 'Banking',
    featured: true,
    savings: 'Up to $2,400/year',
    rating: 4.8
  },
  {
    id: 'cryptocurrency-investment-guide-2025-bitcoin-ethereum',
    slug: 'cryptocurrency-investment-guide-2025-bitcoin-ethereum',
    title: 'Cryptocurrency Investment Guide 2025: Bitcoin, Ethereum & Beyond',
    excerpt: 'Complete crypto investment strategy for 2025, including new regulations and market predictions.',
    readTime: '12 min',
    category: 'Crypto',
    rating: 4.6
  },
  {
    id: 'best-identity-theft-protection-services-2025-ai-security',
    slug: 'best-identity-theft-protection-services-2025-ai-security',
    title: 'Best Identity Theft Protection 2025: AI-Powered Security Analysis',
    excerpt: 'Comprehensive review of identity protection services with new AI-powered monitoring capabilities.',
    readTime: '10 min',
    category: 'Security',
    featured: true,
    rating: 4.7
  },
  {
    id: 'tax-software-2025-ai-optimization-maximum-refund',
    slug: 'tax-software-2025-ai-optimization-maximum-refund',
    title: 'Best Tax Software 2025: AI Optimization for Maximum Refunds',
    excerpt: 'AI-powered tax software comparison for 2025 tax season with automated deduction discovery.',
    readTime: '9 min',
    category: 'Taxes',
    savings: 'Average $1,200 refund increase',
    rating: 4.5
  }
];

export const MONEY_CONFIG = {
  sectionTitle: 'Money & Finance 2025',
  sectionDescription: 'Smart financial decisions with expert analysis and AI-powered tools',
  maxArticles: 4,
  showSavings: true,
  showRatings: true,
  ctaText: 'View All Money Guides'
};