import { SITE_CONFIG } from './constants';

export interface SearchSuggestion {
  query: string;
  category?: string;
  label: string;
  count: string;
  trending?: boolean;
}

export const POPULAR_SEARCHES: SearchSuggestion[] = [
  { 
    query: 'AI tools 2025', 
    category: 'ai', 
    label: 'AI Tools 2025', 
    count: '20+ articles',
    trending: true
  },
  { 
    query: 'VPN 2025', 
    category: 'tech', 
    label: 'VPN Reviews 2025', 
    count: '15+ articles',
    trending: true
  },
  { 
    query: 'iPhone 16', 
    category: 'tech', 
    label: 'iPhone 16 Series', 
    count: '12+ articles' 
  },
  { 
    query: 'Samsung Galaxy S25', 
    category: 'tech', 
    label: 'Galaxy S25', 
    count: '10+ articles' 
  },
  { 
    query: 'OLED TV 2025', 
    category: 'tech', 
    label: 'OLED TVs 2025', 
    count: '14+ articles' 
  },
  { 
    query: 'smart home 2025', 
    category: 'home', 
    label: 'Smart Home 2025', 
    count: '25+ articles',
    trending: true
  },
  { 
    query: 'ChatGPT 2025', 
    category: 'ai', 
    label: 'ChatGPT 2025', 
    count: '8+ articles' 
  },
  { 
    query: 'Nintendo Switch 2', 
    category: 'entertainment', 
    label: 'Gaming 2025', 
    count: '12+ articles' 
  },
  { 
    query: 'electric vehicles 2025', 
    category: 'tech', 
    label: 'EVs 2025', 
    count: '9+ articles' 
  },
  { 
    query: 'fitness tracker 2025', 
    category: 'wellness', 
    label: 'Fitness Tech 2025', 
    count: '10+ articles' 
  },
  { 
    query: 'cybersecurity 2025', 
    category: 'news', 
    label: 'Security 2025', 
    count: '15+ articles',
    trending: true
  },
  { 
    query: 'streaming services 2025', 
    category: 'entertainment', 
    label: 'Streaming 2025', 
    count: '8+ articles' 
  }
];

// 搜索变体映射
export const SEARCH_VARIANTS: { [key: string]: string[] } = {
  'ai': ['artificial intelligence', 'machine learning', 'ml', 'ai tools 2025'],
  'artificial intelligence': ['ai', 'machine learning', 'ai 2025'],
  'machine learning': ['ai', 'ml', 'artificial intelligence'],
  'ml': ['machine learning', 'ai'],
  'vr': ['virtual reality', 'meta quest'],
  'virtual reality': ['vr', 'meta quest'],
  'ar': ['augmented reality', 'mixed reality'],
  'augmented reality': ['ar', 'mixed reality'],
  'tv': ['television', 'display', 'oled', 'qled'],
  'television': ['tv', 'display'],
  'phone': ['smartphone', 'mobile', 'iphone', 'android'],
  'smartphone': ['phone', 'mobile'],
  'mobile': ['phone', 'smartphone'],
  'laptop': ['notebook', 'computer', 'macbook'],
  'notebook': ['laptop', 'computer'],
  'computer': ['laptop', 'pc'],
  'pc': ['computer', 'desktop'],
  'review': ['reviews', 'test', 'analysis', '2025 review'],
  'reviews': ['review', 'test', 'analysis'],
  'best': ['top', 'better', 'good', 'best 2025'],
  'top': ['best', 'better'],
  'guide': ['guides', 'how to', 'tutorial'],
  'guides': ['guide', 'how to', 'tutorial'],
  'vpn': ['virtual private network', 'vpn 2025'],
  'oled': ['organic led', 'oled tv'],
  'qled': ['quantum led', 'samsung qled'],
  'iphone': ['apple phone', 'iphone 16'],
  'android': ['google phone', 'samsung galaxy'],
  'samsung': ['galaxy', 'samsung galaxy s25'],
  'galaxy': ['samsung', 'galaxy s25'],
  'nintendo': ['switch', 'nintendo switch 2'],
  'playstation': ['ps5', 'sony', 'playstation 5'],
  'xbox': ['microsoft', 'xbox series'],
  'chatgpt': ['chat gpt', 'openai', 'gpt'],
  'gemini': ['google ai', 'bard', 'google gemini'],
  'tesla': ['electric car', 'ev', 'model y'],
  'electric': ['ev', 'electric vehicle', 'tesla'],
  'crypto': ['cryptocurrency', 'bitcoin', 'ethereum'],
  'bitcoin': ['crypto', 'cryptocurrency', 'btc'],
  'smart home': ['home automation', 'iot', 'smart devices'],
  'fitness': ['health', 'wellness', 'fitness tracker'],
  'security': ['privacy', 'cybersecurity', 'protection']
};

// 搜索配置
export const SEARCH_CONFIG = {
  minQueryLength: 2,
  maxSuggestions: 5,
  debounceDelay: SITE_CONFIG.performance.debounceDelay,
  highlightMatches: true,
  caseSensitive: false,
  fuzzyMatch: true,
  scoreThreshold: 0.1
};