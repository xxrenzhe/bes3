import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import { articles } from '../data/articles';
import { ROUTES } from '../config/constants';
import ImageOptimized from './ImageOptimized';

const HeroSection: React.FC = () => {
  const featuredArticles = articles.filter(article => article.featured);
  const mainArticle = featuredArticles[0];
  const sideArticles = featuredArticles.slice(1);

  const handleArticleClick = () => {
    window.scrollTo(0, 0);
  };

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.scrollTo(0, 0);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Featured Article */}
        <div className="lg:col-span-2">
          <Link 
            to={ROUTES.article(mainArticle.slug)} 
            className="relative group cursor-pointer block"
            onClick={handleArticleClick}
          >
            <div className="aspect-video overflow-hidden rounded-lg">
              <ImageOptimized
                src={mainArticle.imageUrl}
                alt={mainArticle.title}
                category={mainArticle.category}
                priority={true}
                className="w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-lg" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <Link 
                to={ROUTES.category(mainArticle.category.toLowerCase())}
                onClick={handleCategoryClick}
                className="inline-block bg-red-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3 hover:bg-red-700 transition-colors"
              >
                {mainArticle.category}
              </Link>
              <h2 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 group-hover:text-red-200 transition-colors leading-tight">
                {mainArticle.title}
              </h2>
              <p className="text-gray-200 text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 line-clamp-2 leading-relaxed">
                {mainArticle.excerpt}
              </p>
              <div className="flex items-center space-x-3 sm:space-x-4 text-gray-300 text-xs sm:text-sm">
                <div className="flex items-center space-x-1">
                  <ImageOptimized
                    src={mainArticle.author.avatar}
                    alt={mainArticle.author.name}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                  />
                  <span>{mainArticle.author.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} className="sm:w-4 sm:h-4" />
                  <span>{mainArticle.readTime}</span>
                </div>
                <span className="hidden sm:inline">{new Date(mainArticle.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Side Featured Articles */}
        <div className="space-y-4 sm:space-y-6">
          {sideArticles.map((article) => (
            <Link 
              key={article.id} 
              to={ROUTES.article(article.slug)} 
              className="group cursor-pointer block"
              onClick={handleArticleClick}
            >
              <div className="flex space-x-3 sm:space-x-4">
                <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 overflow-hidden rounded-lg">
                  <ImageOptimized
                    src={article.imageUrl}
                    alt={article.title}
                    category={article.category}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link 
                    to={ROUTES.category(article.category.toLowerCase())}
                    onClick={handleCategoryClick}
                    className="inline-block bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded text-xs font-medium mb-2 transition-colors"
                  >
                    {article.category}
                  </Link>
                  <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-2 line-clamp-2 text-sm sm:text-base leading-tight">
                    {article.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-gray-500 text-xs">
                    <span className="truncate">{article.author.name}</span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;