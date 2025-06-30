export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  author: {
    name: string;
    avatar: string;
  };
  publishedAt: string;
  readTime: string;
  featured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  relevanceScore?: number; // 添加相关性评分字段
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories?: string[];
}