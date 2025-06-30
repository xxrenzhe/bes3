import { Category } from '../types';

export const categories: Category[] = [
  {
    id: '1',
    name: 'News',
    slug: 'news',
    subcategories: ['Breaking News', 'Industry Updates', 'Policy & Regulation', 'Market Analysis', 'Security Alerts']
  },
  {
    id: '2',
    name: 'AI',
    slug: 'ai',
    subcategories: ['Machine Learning', 'ChatGPT & LLMs', 'AI Tools', 'Ethics & Policy', 'Computer Vision', 'Natural Language Processing']
  },
  {
    id: '3',
    name: 'Tech',
    slug: 'tech',
    subcategories: ['Smartphones', 'Laptops', 'VPN & Security', 'Audio & Headphones', 'TV & Display', 'Networking', 'Wearables']
  },
  {
    id: '4',
    name: 'Home',
    slug: 'home',
    subcategories: ['Smart Home', 'Kitchen Appliances', 'Outdoor & Garden', 'Security Systems', 'Cleaning & Maintenance', 'Energy & Solar']
  },
  {
    id: '5',
    name: 'Entertainment',
    slug: 'entertainment',
    subcategories: ['Gaming', 'Streaming Services', 'Movies & TV', 'Music & Audio', 'VR & AR', 'Content Creation']
  },
  {
    id: '6',
    name: 'Wellness',
    slug: 'wellness',
    subcategories: ['Sleep & Recovery', 'Fitness & Exercise', 'Nutrition & Diet', 'Mental Health', 'Air Quality', 'Personal Care']
  },
  {
    id: '7',
    name: 'Money',
    slug: 'money',
    subcategories: ['Banking & Savings', 'Investment & Trading', 'Personal Finance', 'Insurance', 'Credit & Loans', 'Cryptocurrency']
  },
  {
    id: '8',
    name: 'Cover Story',
    slug: 'cover-story',
    subcategories: ['Investigations', 'Deep Dives', 'Industry Analysis', 'Future Tech', 'Social Impact']
  }
];