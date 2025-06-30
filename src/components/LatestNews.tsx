import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { LATEST_NEWS, NEWS_CONFIG } from '../config/newsConfig';
import { ROUTES } from '../config/constants';

const LatestNews: React.FC = () => {
  const handleNewsClick = () => {
    window.scrollTo(0, 0);
  };

  const displayNews = LATEST_NEWS.slice(0, NEWS_CONFIG.maxDisplayItems);

  return (
    <section className="bg-red-600 text-white py-3 sm:py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-bold text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
              Latest on Bes3 2025
            </span>
          </div>
          <div className="flex space-x-6 sm:space-x-8">
            {displayNews.map((item) => (
              <Link 
                key={item.id} 
                to={ROUTES.article(item.slug)}
                className="flex-shrink-0 group cursor-pointer block min-w-0"
                onClick={handleNewsClick}
              >
                <div className="flex items-center space-x-2 text-xs sm:text-sm">
                  <Clock size={12} className="sm:w-3.5 sm:h-3.5 text-red-200 flex-shrink-0" />
                  <span className="text-red-200 whitespace-nowrap">{item.timeAgo}</span>
                  {item.urgent && (
                    <span className="bg-yellow-500 text-black px-1 rounded text-xs font-bold">URGENT</span>
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-medium group-hover:text-red-200 transition-colors line-clamp-1 max-w-xs leading-tight">
                  {item.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LatestNews;