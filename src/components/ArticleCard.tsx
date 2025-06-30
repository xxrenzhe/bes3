import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import { Article } from '../types';
import { ROUTES } from '../config/constants';
import ImageOptimized from './ImageOptimized';

interface ArticleCardProps {
  article: Article;
  size?: 'small' | 'medium' | 'large';
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, size = 'medium' }) => {
  const sizeClasses = {
    small: 'flex space-x-3',
    medium: '',
    large: 'lg:col-span-2'
  };

  const imageClasses = {
    small: 'w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0',
    medium: 'aspect-video',
    large: 'aspect-video'
  };

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleArticleClick = () => {
    window.scrollTo(0, 0);
  };

  if (size === 'small') {
    return (
      <article className={sizeClasses.small}>
        <Link 
          to={ROUTES.article(article.slug)} 
          className="group cursor-pointer flex-shrink-0"
          onClick={handleArticleClick}
        >
          <div className={`${imageClasses.small} overflow-hidden rounded-lg`}>
            <ImageOptimized
              src={article.imageUrl}
              alt={article.title}
              category={article.category}
              className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link 
            to={ROUTES.category(article.category.toLowerCase())}
            onClick={handleCategoryClick}
            className="inline-block bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded text-xs font-medium mb-1 transition-colors"
          >
            {article.category}
          </Link>
          <Link 
            to={ROUTES.article(article.slug)} 
            className="group cursor-pointer"
            onClick={handleArticleClick}
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors text-sm line-clamp-2 mb-1 leading-tight">
              {article.title}
            </h3>
          </Link>
          <div className="flex items-center space-x-2 text-gray-500 text-xs">
            <span className="truncate">{article.author.name}</span>
            <span>•</span>
            <span>{article.readTime}</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group ${sizeClasses[size]}`}>
      <Link 
        to={ROUTES.article(article.slug)} 
        className="cursor-pointer"
        onClick={handleArticleClick}
      >
        <div className={`${imageClasses[size]} overflow-hidden`}>
          <ImageOptimized
            src={article.imageUrl}
            alt={article.title}
            category={article.category}
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <Link 
            to={ROUTES.category(article.category.toLowerCase())}
            onClick={handleCategoryClick}
            className="inline-block bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded text-xs font-medium transition-colors"
          >
            {article.category}
          </Link>
          <span className="text-gray-500 text-xs">
            {new Date(article.publishedAt).toLocaleDateString()}
          </span>
        </div>
        <Link 
          to={ROUTES.article(article.slug)} 
          className="cursor-pointer"
          onClick={handleArticleClick}
        >
          <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-2 line-clamp-2 text-sm sm:text-base leading-tight">
            {article.title}
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
            {article.excerpt}
          </p>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <ImageOptimized
              src={article.author.avatar}
              alt={article.author.name}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
            />
            <span className="text-gray-700 text-xs sm:text-sm font-medium truncate">{article.author.name}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500 text-xs sm:text-sm flex-shrink-0">
            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
            <span>{article.readTime}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ArticleCard;