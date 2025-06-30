import React from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, ChevronRight, Star } from 'lucide-react';
import { MONEY_ARTICLES, MONEY_CONFIG } from '../config/moneyConfig';
import { ROUTES } from '../config/constants';

const MoneySection: React.FC = () => {
  const handleArticleClick = () => {
    window.scrollTo(0, 0);
  };

  const handleViewAllClick = () => {
    window.scrollTo(0, 0);
  };

  const displayArticles = MONEY_ARTICLES.slice(0, MONEY_CONFIG.maxArticles);

  return (
    <section className="bg-green-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <DollarSign className="text-green-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">{MONEY_CONFIG.sectionTitle}</h2>
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <Link 
            to={ROUTES.category('money')}
            className="flex items-center space-x-1 text-green-600 hover:text-green-700 font-medium transition-colors"
            onClick={handleViewAllClick}
          >
            <span>{MONEY_CONFIG.ctaText}</span>
            <ChevronRight size={16} />
          </Link>
        </div>
        
        <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          {MONEY_CONFIG.sectionDescription}
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayArticles.map((article) => (
            <Link 
              key={article.id} 
              to={ROUTES.article(article.slug)} 
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group cursor-pointer block"
              onClick={handleArticleClick}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    article.featured 
                      ? 'bg-green-600 text-white' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {article.category}
                    {article.featured && <span className="ml-1">⭐</span>}
                  </span>
                  <span className="text-gray-500 text-xs">{article.readTime}</span>
                </div>
                
                <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition-colors mb-3 line-clamp-2">
                  {article.title}
                </h3>
                
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
                
                {/* Additional info */}
                <div className="space-y-2">
                  {MONEY_CONFIG.showSavings && article.savings && (
                    <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                      <TrendingUp size={14} />
                      <span>{article.savings}</span>
                    </div>
                  )}
                  
                  {MONEY_CONFIG.showRatings && article.rating && (
                    <div className="flex items-center space-x-1">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={`${
                              i < Math.floor(article.rating!) 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{article.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MoneySection;