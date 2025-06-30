import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Article } from '../types';
import ArticleCard from './ArticleCard';

interface CategorySectionProps {
  title: string;
  articles: Article[];
  showViewAll?: boolean;
  categorySlug?: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({ 
  title, 
  articles, 
  showViewAll = true,
  categorySlug 
}) => {
  const handleViewAllClick = () => {
    window.scrollTo(0, 0);
  };

  const getCategorySlug = () => {
    if (categorySlug) return categorySlug;
    if (articles.length > 0) {
      const categoryMap: { [key: string]: string } = {
        'News': 'news',
        'AI': 'ai',
        'Tech': 'tech',
        'Home': 'home',
        'Entertainment': 'entertainment',
        'Wellness': 'wellness',
        'Money': 'money',
        'Cover Story': 'cover-story'
      };
      return categoryMap[articles[0].category] || articles[0].category.toLowerCase();
    }
    return 'news';
  };

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        {showViewAll && (
          <Link 
            to={`/category/${getCategorySlug()}`}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium transition-colors text-sm sm:text-base"
            onClick={handleViewAllClick}
          >
            <span>View All</span>
            <ChevronRight size={14} className="sm:w-4 sm:h-4" />
          </Link>
        )}
      </div>
      
      {/* 手机端优化网格布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {articles.map((article, index) => (
          <ArticleCard
            key={article.id}
            article={article}
            size={index === 0 && articles.length > 4 && window.innerWidth >= 1024 ? 'large' : 'medium'}
          />
        ))}
      </div>
    </section>
  );
};

export default CategorySection;