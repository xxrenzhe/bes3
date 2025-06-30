export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  timeAgo: string;
  category: string;
  urgent?: boolean;
}

export const LATEST_NEWS: NewsItem[] = [
  {
    id: 'apple-vision-pro-2-leaked-specs-2025',
    slug: 'apple-vision-pro-2-leaked-specs-2025',
    title: 'Apple Vision Pro 2 Leaked Specs: Revolutionary Eye Tracking in 2025',
    timeAgo: '12 min ago',
    category: 'Tech',
    urgent: true
  },
  {
    id: 'openai-gpt-5-release-date-2025-features',
    slug: 'openai-gpt-5-release-date-2025-features',
    title: 'OpenAI GPT-5 Release Date Confirmed: Game-Changing AI Features',
    timeAgo: '28 min ago',
    category: 'AI',
    urgent: true
  },
  {
    id: 'tesla-model-2-25000-electric-car-2025',
    slug: 'tesla-model-2-25000-electric-car-2025',
    title: 'Tesla Model 2: $25,000 Electric Car Finally Arrives in 2025',
    timeAgo: '45 min ago',
    category: 'Tech'
  },
  {
    id: 'meta-quest-4-wireless-vr-breakthrough-2025',
    slug: 'meta-quest-4-wireless-vr-breakthrough-2025',
    title: 'Meta Quest 4 Wireless VR Breakthrough Changes Everything',
    timeAgo: '1 hour ago',
    category: 'Entertainment'
  },
  {
    id: 'samsung-galaxy-s25-ultra-camera-ai-2025',
    slug: 'samsung-galaxy-s25-ultra-camera-ai-2025',
    title: 'Samsung Galaxy S25 Ultra Camera AI: Professional Photography Revolution',
    timeAgo: '1 hour ago',
    category: 'Tech'
  },
  {
    id: 'smart-home-security-breach-protection-2025',
    slug: 'smart-home-security-breach-protection-2025',
    title: 'Smart Home Security Breach: 9 Ways to Protect Your Family in 2025',
    timeAgo: '2 hours ago',
    category: 'Home'
  }
];

export const NEWS_CONFIG = {
  maxDisplayItems: 3,
  refreshInterval: 300000, // 5 minutes
  scrollSpeed: 50, // pixels per second
  autoScroll: true,
  pauseOnHover: true
};